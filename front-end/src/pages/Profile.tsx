import "../Style/profile.css";
import "bootstrap/dist/css/bootstrap.min.css";
import NavBar from "../component/NavBar";
import { useState, useEffect, Fragment } from "react";

type UserProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  age?: number;
  phone?: string;
  gender?: string;
};

function Profile() {
  const [user, setUser] = useState<UserProfile>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("🔑 Profile - Token from localStorage:", token ? "✅ موجود" : "❌ مش موجود");

    if (!token) {
      console.log("🚨 No token in Profile → redirect to login");
      window.location.href = "/login";
      return;
    }

    fetch("/users", {   // ← بدون / في النهاية
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        console.log("📡 Profile fetch status:", response.status);
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Unauthorized");
        }
      })
      .then((data) => {
        console.log("✅ Profile data received:", data);
        setUser(data);
      })
      .catch((error) => {
        console.error("❌ Profile error:", error);
        window.location.href = "/login";
      });
  }, []);

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
                        <img src={user.gender === "female" ? "/src/assets/profileGirl.jpg" : "/src/assets/profile.jpg"} alt="Profile" />
                      </div>
                      <div className="col-lg-4 align-self-center">
                        <div className="main-info header-text">
                          <h1>{user.firstName}</h1>
                          <h5>{user.lastName}</h5>
                          <p>"I'm {user.firstName}, a passionate gamer..." </p>
                          <div className="main-border-button">
                            <a href="#">Update</a>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-4 align-self-center">
                        <ul>
                          <li>Email <span>{user.email}</span></li>
                          <li>Age <span>{user.age}</span></li>
                          <li>Phone <span>{user.phone}</span></li>
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
