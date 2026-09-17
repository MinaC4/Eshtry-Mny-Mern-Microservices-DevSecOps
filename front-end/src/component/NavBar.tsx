import "../Style/NavBar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import { API_BASE } from "../config/api";
import axios from "axios";
import profileHeader from "../assets/profile-header.jpg";

function NavBar() {
  const [activeLink, setActiveLink] = useState("home");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/users`)
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  const handleLinkClick = (name: string) => {
    setActiveLink(name);
  };

  const handleLogout = (event: React.MouseEvent) => {
    event.preventDefault();
    axios.post(`${API_BASE}/users/logout`)
      .catch(() => {})
      .finally(() => { window.location.href = "/login"; });
  };

  return (
    <header className="header-area header-sticky">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <nav className="main-nav">
              <a href="/" className="logo">
                <h4>
                  <em>Gaming</em> Strore
                </h4>
              </a>
              <ul className="nav">
                <li>
                  <a href="/" className="active" onClick={() => handleLinkClick("home")}>
                    Home
                  </a>
                </li>
                <li>
                  <a href="/cart" onClick={() => handleLinkClick("cart")}>
                    Cart
                  </a>
                </li>
                {authed ? (
                  <li>
                    <a href="/login" onClick={handleLogout}>
                      Logout
                    </a>
                  </li>
                ) : (
                  <li>
                    <a href="/login" onClick={() => handleLinkClick("login")}>
                      Login
                    </a>
                  </li>
                )}
                <li>
                  <a href="/profile" onClick={() => handleLinkClick("profile")}>
                    Profile <img src={profileHeader} alt="" />
                  </a>
                </li>
              </ul>
              <a className="menu-trigger">
                <span>Menu</span>
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
export default NavBar;
