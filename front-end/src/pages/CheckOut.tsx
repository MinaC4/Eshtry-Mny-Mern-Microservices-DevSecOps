import { Fragment, useEffect, useState } from "react";
import "../Style/CheckOut.css";
import { API_BASE } from "../config/api";
import axios from "axios";

type CartProduct = { _id: string; image?: string; name: string; category?: string; price: number };
type Receipt = {
  orderId: string;
  date: string;
  email: string;
  items: CartProduct[];
  total: number;
};

function CheckOut() {
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/users`)
      .then((r) => setEmail(r.data?.email || ""))
      .catch(() => {});

    axios.get(`${API_BASE}/cart`)
      .then((response) => {
        setProducts(response.data.Products || []);
        setTotal(response.data.total || 0);
      })
      .catch((error) => {
        if (error.response?.status === 401) { window.location.href = "/login"; }
      })
      .finally(() => setLoading(false));
  }, []);

  function submitHandler() {
    axios.delete(`${API_BASE}/cart/checkout`)
      .then((response) => {
        const d = response.data || {};
        setReceipt({
          orderId: d.orderId || "—",
          date: d.createdAt ? new Date(d.createdAt).toLocaleString() : new Date().toLocaleString(),
          email: email || "—",
          items: d.items || [],
          total: typeof d.total === "number" ? d.total : 0
        });
        setProducts([]);
        setTotal(0);
      })
      .catch((error) => {
        if (error.response?.status === 401) { window.location.href = "/login"; }
        else { alert("Checkout failed. Please try again."); }
      });
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px" }}>Loading your order...</div>;
  }

  if (receipt) {
    const itemCount = receipt.items.length;
    return (
      <Fragment>
        <div className="wrapper">
          <div className="spaceto">
            <div className="containers" style={{ maxWidth: "760px" }}>
              <div className="title">Order Receipt</div>

              <div style={{ padding: "24px 32px" }}>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0 }}>
                    <em>Gaming</em> Store
                  </h3>
                  <p style={{ color: "#888", margin: "4px 0" }}>Demo order — no payment processed</p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px 24px",
                    borderTop: "1px solid #e5e5e5",
                    borderBottom: "1px solid #e5e5e5",
                    padding: "16px 0",
                    marginBottom: "16px"
                  }}
                >
                  <div><strong>Order #:</strong> {receipt.orderId}</div>
                  <div style={{ textAlign: "right" }}><strong>Date:</strong> {receipt.date}</div>
                  <div><strong>Customer:</strong> {receipt.email}</div>
                  <div style={{ textAlign: "right" }}><strong>Payment:</strong> Demo / N/A</div>
                </div>

                <table className="cart-table-product" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #333" }}>
                      <th style={{ textAlign: "left", padding: "8px 0" }}>Item</th>
                      <th style={{ textAlign: "left", padding: "8px 0" }}>Category</th>
                      <th style={{ textAlign: "right", padding: "8px 0" }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((p) => (
                      <tr key={p._id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px 0" }}>{p.name}</td>
                        <td style={{ padding: "8px 0", color: "#888" }}>{p.category || "—"}</td>
                        <td style={{ padding: "8px 0", textAlign: "right" }}>${p.price}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ textAlign: "right", paddingTop: "12px" }}>
                        Items: <strong>{itemCount}</strong>
                      </td>
                      <td style={{ textAlign: "right", paddingTop: "12px" }}>${receipt.total}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ textAlign: "right", fontSize: "18px", paddingTop: "4px" }}>
                        <strong>Total</strong>
                      </td>
                      <td style={{ textAlign: "right", fontSize: "18px", paddingTop: "4px" }}>
                        <strong>${receipt.total}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <p style={{ textAlign: "center", padding: "20px 0 0", color: "#888" }}>
                  Thank you for your order. Your cart has been cleared.
                </p>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "12px" }}>
                  <button className="searchButton" type="button" onClick={() => window.print()}>
                    Print receipt
                  </button>
                  <a href="/" className="searchButton">Continue shopping</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  const itemCount = products.length;
  return (
    <Fragment>
      <div className="wrapper">
        <div className="spaceto">
          <div className="containers" style={{ maxWidth: "760px" }}>
            <div className="title">Checkout</div>

            <div style={{ padding: "24px 32px" }}>
              {products.length === 0 ? (
                <p style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                  Your cart is empty. <a href="/">Browse games</a>.
                </p>
              ) : (
                <Fragment>
                  <table className="cart-table-product" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #333" }}>
                        <th style={{ textAlign: "left", padding: "8px 0" }}>Item</th>
                        <th style={{ textAlign: "left", padding: "8px 0" }}>Category</th>
                        <th style={{ textAlign: "right", padding: "8px 0" }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p._id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "8px 0" }}>{p.name}</td>
                          <td style={{ padding: "8px 0", color: "#888" }}>{p.category || "—"}</td>
                          <td style={{ padding: "8px 0", textAlign: "right" }}>${p.price}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ textAlign: "right", paddingTop: "12px" }}>
                          Items: <strong>{itemCount}</strong>
                        </td>
                        <td style={{ textAlign: "right", paddingTop: "12px" }}>${total}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ textAlign: "right", fontSize: "18px", paddingTop: "4px" }}>
                          <strong>Total</strong>
                        </td>
                        <td style={{ textAlign: "right", fontSize: "18px", paddingTop: "4px" }}>
                          <strong>${total}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <p style={{ textAlign: "center", padding: "20px 0 0", color: "#888" }}>
                    This is a demo application. Clicking "Place Order" clears your cart. No payment is processed.
                  </p>

                  <div style={{ textAlign: "center", marginTop: "8px" }}>
                    <button className="searchButton" type="button" onClick={submitHandler}>
                      Place Order
                    </button>
                  </div>
                </Fragment>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
export default CheckOut;
