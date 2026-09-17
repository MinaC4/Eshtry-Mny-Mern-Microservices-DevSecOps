import "../Style/profile.css";
import "bootstrap/dist/css/bootstrap.min.css";
import NavBar from "../component/NavBar";
import { useState, useEffect, Fragment } from "react";
import { API_BASE } from "../config/api";
import axios from "axios";
import profileImg from "../assets/profile.jpg";
import profileGirlImg from "../assets/profileGirl.jpg";

type UserProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  age?: number;
  phone?: string;
  gender?: string;
  role?: string;
  createdAt?: string;
};

function Profile() {
  const [user, setUser] = useState<UserProfile>({});
  const [cartCount, setCartCount] = useState<number | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/users`)
      .then((response) => { setUser(response.data); })
      .catch((error) => {
        console.error("Profile error:", error);
        window.location.href = "/login";
      });

    axios.get(`${API_BASE}/cart`)
      .then((response) => { setCartCount((response.data.Products || []).length); })
      .catch(() => { /* cart requires auth; ignore */ });
  }, []);

  const handleLogout = () => {
    axios.post(`${API_BASE}/users/logout`)
      .catch(() => {})
      .finally(() => { window.location.href = "/login"; });
  };

  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—";

  return (
    <Fragment>
      <NavBar />
      <div className="widt">
        <div className="row">
          <div className="col-lg-12">
            <div className="page-content">
              <div className="row">
                <div className="col-lg-12">
                  <div className="main-profile">
                    <div className="row">
                      <div className="col-lg-4">
                        <img src={user.gender === "female" ? profileGirlImg : profileImg} alt="Profile" />
                      </div>
                      <div className="col-lg-4 align-self-center">
                        <div className="main-info header-text">
                          <h1>{user.firstName || "Player"}</h1>
                          <h5>{user.lastName || ""}</h5>
                          <p>
                            {user.firstName
                              ? `Hi ${user.firstName}, welcome back to your profile.`
                              : "Loading your profile..."}
                          </p>
                          <div className="main-border-button">
                            <button className="searchButton" type="button" onClick={handleLogout}>
                              Logout
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-4 align-self-center">
                        <ul>
                          <li>Email <span>{user.email || "—"}</span></li>
                          <li>Age <span>{user.age ?? "—"}</span></li>
                          <li>Phone <span>{user.phone || "—"}</span></li>
                          <li>Gender <span>{user.gender || "Not set"}</span></li>
                          <li>Role <span>{user.role || "customer"}</span></li>
                          <li>Member since <span>{memberSince}</span></li>
                          <li>Items in cart <span>{cartCount ?? 0}</span></li>
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

export default Profile;
