import "../Style/profile.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Fragment, useState, useEffect } from "react";
import { API_BASE } from "../config/api";
import axios from "axios";

type ProductDetail = {
  image?: string;
  name?: string;
  description?: string;
  category?: string;
  price?: number;
};

function ProductInfo() {
  const [inputValue, setInputValue] = useState<ProductDetail>({});
  const productID = localStorage.getItem("productID");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/products/${productID}`);
        const data = response.data;
        setInputValue(data);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchData();
  }, []);

  const onSubmithandler = () => {
    axios.post(`${API_BASE}/cart/${productID}`)
      .then((response) => {
        if (response.status === 200) { alert("Added to cart"); }
        else { window.location.href = "/login"; }
      })
      .catch((error) => {
        console.error("Error:", error);
        if (error.response?.status === 401) { window.location.href = "/login"; }
      });
  };

  return (
    <Fragment>
      <div className="widt">
        <div className="row">
          <div className="col-lg-12">
            <div className="page-content">
              <div className="row">
                <div className="col-lg-12">
                  <div className="main-profile ">
                    <div className="row">
                      <div className="col-lg-4">
                        <img src={inputValue.image} alt="" />
                      </div>
                      <div className="col-lg-4 align-self-center">
                        <div className="main-info header-text">
                          <h4>{inputValue.name}</h4>
                          <p>{inputValue.description}</p>
                          <div className="main-button">
                            <button className="searchButton" type="button" onClick={onSubmithandler}>
                              Add To Cart
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-4 align-self-center">
                        <ul>
                          <li>
                            Game Category <span>{inputValue.category}</span>
                          </li>
                          <li>
                            Price <span>{inputValue.price}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

export default ProductInfo;
