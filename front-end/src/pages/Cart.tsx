import { Fragment, useEffect, useState } from "react";
import "../Style/Cart.css";
import NavBar from "../component/NavBar";
import { API_BASE } from "../config/api";
import axios from "axios";

declare global {
  interface Window {
    refreshCart?: () => void;
  }
}
type CartProduct = { _id: string; image: string; name: string; category: string; price: number };

function Cart() {
  const [cartData, setCartData] = useState<{ total: number; Products: CartProduct[] }>({ total: 0, Products: [] });
  const [loading, setLoading] = useState(true);

  const fetchCartData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/cart`);
      if (response.status === 200) { setCartData(response.data); }
    } catch (error: any) {
      console.error("Error fetching cart:", error);
      if (error.response?.status === 401) { window.location.href = "/login"; }
    } finally { setLoading(false); }
  };

  const removeItem = async (productId: string) => {
    try {
      await axios.delete(`${API_BASE}/cart/${productId}`);
      await fetchCartData();
    } catch (error) {
      console.error("Error removing item:", error);
      alert("Could not remove the item. Please try again.");
    }
  };

  useEffect(() => {
    fetchCartData();
  }, []);

  useEffect(() => {
    window.refreshCart = fetchCartData;
    return () => { delete window.refreshCart; };
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px" }}>Loading your cart...</div>;
  }

  return (
    <Fragment>
      <NavBar />
      <div className="backgrounds">
        <div className="spacefo2">
          <div className="cart-page">
            <div className="cart-page-container">
              <div className="cart-page-header">
                <h2 className="cart-header-text">Your Games Cart</h2>
              </div>

              <div className="cart-page-table">
                <table className="cart-table-product">
                  <thead>
                    <tr className="cart-table-header">
                      <th className="cart-table-img">Product Image</th>
                      <th className="cart-table-desktop cart-table-payment">Name</th>
                      <th className="cart-table-desktop cart-table-size">Category</th>
                      <th className="cart-table-size right-text-mobile">Price</th>
                      <th className="cart-table-size">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartData.Products && cartData.Products.length > 0 ? (
                      cartData.Products.map((product: any) => (
                        <tr className="cart-table-content" key={product._id}>
                          <td className="cart-table-image-info">
                            <img
                              src={product.image}
                              alt={product.name}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                            />
                          </td>
                          <td className="bold-text">{product.name}</td>
                          <td>{product.category}</td>
                          <td>${product.price}</td>
                          <td>
                            <button className="searchButton" type="button" onClick={() => removeItem(product._id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "40px" }}>
                          Your cart is empty. Add some games!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="total-section">
                <p>Total: <strong>${cartData.total}</strong></p>
                <a href="/checkout">
                  <button className="searchButton" disabled={!cartData.Products || cartData.Products.length === 0}>
                    Proceed to Checkout
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

export default Cart;
