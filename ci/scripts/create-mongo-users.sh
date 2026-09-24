#!/usr/bin/env bash
# Create least-privilege MongoDB users for each service (ADR D... / report E-02).
# One user per service, each scoped to its own collection(s), instead of a shared
# root account. Idempotent. Run once after the Secret exists.
#
# Usage: VALUES_SECRET=values-secret.yaml NAMESPACE=eshtry-mny ./ci/scripts/create-mongo-users.sh
set -euo pipefail

VALUES="${VALUES_SECRET:-values-secret.yaml}"
NS="${NAMESPACE:-eshtry-mny}"
[ -f "$VALUES" ] || { echo "missing $VALUES"; exit 1; }

ru=$(yq -r '.secrets.mongoUsername' "$VALUES")
rp=$(yq -r '.secrets.mongoPassword' "$VALUES")
uu=$(yq -r '.secrets.mongoSvcUser.username' "$VALUES")
up=$(yq -r '.secrets.mongoSvcUser.password' "$VALUES")
pu=$(yq -r '.secrets.mongoSvcProduct.username' "$VALUES")
pp=$(yq -r '.secrets.mongoSvcProduct.password' "$VALUES")
cu=$(yq -r '.secrets.mongoSvcCart.username' "$VALUES")
cp=$(yq -r '.secrets.mongoSvcCart.password' "$VALUES")

SCRIPT=$(cat <<EOF
const db = db.getSiblingDB('eshtry_mny');
const mkRole = (name, colls) => {
  const privs = colls.map(c => ({ resource: { db: 'eshtry_mny', collection: c },
    actions: ['find','insert','update','remove','createIndex','listIndexes','dropIndex'] }));
  privs.push({ resource: { db: 'eshtry_mny', collection: '' }, actions: ['listCollections'] });
  if (db.getRole(name)) { db.updateRole(name, { privileges: privs, roles: [] }); }
  else { db.createRole({ role: name, privileges: privs, roles: [] }); }
};
const mkUser = (u, p, role) => {
  if (db.getUser(u)) { db.updateUser(u, { pwd: p, roles: [{ role, db: 'eshtry_mny' }] }); }
  else { db.createUser({ user: u, pwd: p, roles: [{ role, db: 'eshtry_mny' }] }); }
};
mkRole('userSvcRole', ['users']);
mkRole('productSvcRole', ['products']);
mkRole('cartSvcRole', ['carts','orders']);
mkUser('${uu}', '${up}', 'userSvcRole');
mkUser('${pu}', '${pp}', 'productSvcRole');
mkUser('${cu}', '${cp}', 'cartSvcRole');
print('mongo least-privilege users ready');
EOF
)

kubectl exec -n "$NS" mongodb-0 -- mongosh "mongodb://${ru}:${rp}@localhost:27017/admin" --quiet --eval "$SCRIPT"
