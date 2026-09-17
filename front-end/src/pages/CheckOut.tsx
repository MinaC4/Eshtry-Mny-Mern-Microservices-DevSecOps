import { Fragment, useEffect, useState } from "react";
import "../Style/CheckOut.css";
import { API_BASE } from "../config/api";
import axios from "axios";

type CartProduct = { _id: string; image?: string; name: string; category?: string; price: number };

function CheckOut() {
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<{ orderId: string; items: CartProduct[]; total: number; date: string } | null>(null);

  useEffect(() => {
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
    const items = products;
    const orderTotal = total;
    axios.delete(`${API_BASE}/cart/checkout`)
      .then((response) => {
        if (response.status === 200) {
          setReceipt({
            orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
            items,
            total: orderTotal,
            date: new Date().toLocaleString()
          });
          setProducts([]);
          setTotal(0);
        }
      })
      .catch((error) => {
        console.error("Checkout error:", error);
        if (error.response?.status === 401) { window.location.href = "/login"; }
        else { alert("Checkout failed. Please try again."); }
      });
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px" }}>Loading your order...</div>;
  }

  if (receipt) {
    return (
      <Fragment>
        <div className="wrapper">
          <div className="spaceto">
            <div className="containers">
              <div className="title">Receipt</div>
              <div className="input-form">
                <div className="section-1">
                  <p><strong>Order:</strong> {receipt.orderId}</p>
                  <p><strong>Date:</strong> {receipt.date}</p>
                  <table className="cart-table-product" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Item</th>
                        <th style={{ textAlign: "right" }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.items.map((p) => (
                        <tr key={p._id}>
                          <td>{p.name}</td>
                          <td style={{ textAlign: "right" }}>${p.price}</td>
                        </tr>
                      ))}
                      <tr>
                        <td><strong>Total</strong></td>
                        <td style={{ textAlign: "right" }}><strong>${receipt.total}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                    Demo order — no payment was processed. Your cart has been cleared.
                  </p>
                  <div style={{ textAlign: "center" }}>
                    <a href="/" className="searchButton">Continue shopping</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <div className="wrapper">
        <div className="spaceto">
          <div className="containers">
            <div className="title">Place Order (Demo)</div>

            <div className="input-form">
              <div className="section-1">
                {products.length === 0 ? (
                  <p style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                    Your cart is empty. <a href="/">Browse games</a>.
                  </p>
                ) : (
                  <Fragment>
                    <table className="cart-table-product" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Item</th>
                          <th style={{ textAlign: "left" }}>Category</th>
                          <th style={{ textAlign: "right" }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p._id}>
                            <td>{p.name}</td>
                            <td>{p.category}</td>
                            <td style={{ textAlign: "right" }}>${p.price}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={2}><strong>Total</strong></td>
                          <td style={{ textAlign: "right" }}><strong>${total}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                    <p style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                      This is a demo application. Clicking "Place Order" will clear your cart.
                      No payment is processed.
                    </p>
                  </Fragment>
                )}
              </div>
            </div>

            <div className="bat" onClick={products.length === 0 ? undefined : submitHandler}>
              Place Order
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
export default CheckOut;
