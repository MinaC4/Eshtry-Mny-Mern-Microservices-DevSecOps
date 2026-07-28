import { Fragment } from "react";
import "../Style/CheckOut.css";
import { API_BASE } from "../config/api";
import axios from "axios";

function CheckOut() {
  function submitHandler() {
    axios.delete(`${API_BASE}/cart/checkout`)
      .then((response) => {
        if (response.status === 200) { alert("Your order has been placed! (Demo — no payment processed)"); }
      })
      .catch((error) => {
        console.error("Checkout error:", error);
        if (error.response?.status === 401) { window.location.href = "/login"; }
      });
  }

  return (
    <Fragment>
      <div className="wrapper">
        <div className="spaceto">
          <div className="containers">
            <div className="title">Place Order (Demo)</div>

            <div className="input-form">
              <div className="section-1">
                <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                  This is a demo application. Clicking "Place Order" will clear your cart.
                  No payment is processed.
                </p>
              </div>
            </div>

            <div className="bat" onClick={submitHandler}>Place Order</div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
export default CheckOut;
