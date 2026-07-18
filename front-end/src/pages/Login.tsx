import { Fragment, useState } from "react";
import "../Style/Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
   
    try {
      const response = await fetch("/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        console.log("✅ Login successful - Token received");
        localStorage.setItem("token", data.token);        // string فقط
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/";
      } else {
        alert("Password or email not correct");
        console.log("❌ Login failed:", data);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      alert("Something went wrong");
    }
  }

  return (
    <Fragment>
      <div className="bg-img">
        <div className="content">
          <header>Login Form</header>
          <form onSubmit={handleSubmit}>
            <h4 className="fieldHeader">Email</h4>
            <div className="field">
              <span className="person"> </span>
              <input
                type="text"
                required
                placeholder="Email or Username"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <h4 className="fieldHeader space">Password</h4>
            <div className="field space">
              <span className="password"></span>
              <input
                type="password"
                className="pass-key"
                required
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="show">SHOW</span>
            </div>
            <div className="field space">
              <input type="submit" value="LOGIN" />
            </div>
          </form>
          <div className="signup space">
            Don't have account? <a href="/register">Signup Now</a>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

export default Login;
