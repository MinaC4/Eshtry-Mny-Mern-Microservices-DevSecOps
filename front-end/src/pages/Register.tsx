import "../Style/Register.css";
import { useState, useEffect } from "react";
import { API_BASE } from "../config/api";
import axios from "axios";

function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confpassword, setconfPassword] = useState("");

  useEffect(() => {
    // Already authenticated? Skip the registration form.
    axios.get(`${API_BASE}/users`)
      .then(() => { window.location.href = "/"; })
      .catch(() => {});
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confpassword) {
      alert("passwords doesn't match");
      return;
    }

    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 13 || ageNum > 120) {
      alert("Age must be a whole number between 13 and 120");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password, firstName, lastName, age: Number(age), phone, gender })
      });
  
      if (response.ok) {
        window.location.href = "/login";
      } else {
        const err = await response.json().catch(() => ({}));
        const detail = err.details && Object.values(err.details).flat().join(", ");
        alert(detail ? `Registration failed: ${detail}` : (err.message || "Registration failed"));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Registration failed: could not reach the server");
    }
  }
  return (
    <div className="bg-img">
      <div className="registerContent">
        <header>Register Form</header>
        <form action={`${API_BASE}/users`} method="post" onSubmit={handleSubmit}>
          <div className="row">
            <div className="col">
              <h6>First name</h6>
            </div>
            <div className="col">
              <h6>Last name</h6>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <div className="field">
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="First Name"
                  name="firstName"
                  onChange={(event) => setFirstName(event.target.value)}
                ></input>
              </div>
            </div>
            <div className="col">
              <div className="field">
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="Last Name"
                  name="lastName"
                  onChange={(event) => setLastName(event.target.value)}
                ></input>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <h6>Email</h6>
            </div>
            <div className="col">
              <h6>Phone number</h6>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <div className="field">
                <input
                  type="email"
                  className="form-control"
                  required
                  placeholder="Email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                ></input>
              </div>
            </div>
            <div className="col">
              <div className="field">
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="Phone"
                  name="phone"
                  onChange={(event) => setPhoneNumber(event.target.value)}
                ></input>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <h6>Password</h6>
            </div>
            <div className="col">
              <h6>Confirm password</h6>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <div className="field">
                <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="Password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                ></input>
              </div>
            </div>
            <div className="col">
              <div className="field">
                <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="Confirm password"
                  onChange={(event) => setconfPassword(event.target.value)}
                ></input>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <h6>Age</h6>
            </div>
            <div className="col">
              <h6>Gender</h6>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="field">
                <input
                  type="number"
                  min="13"
                  max="120"
                  className="form-control"
                  required
                  placeholder="Age"
                  name="age"
                  onChange={(event) => setAge(event.target.value)}
                ></input>
              </div>
            </div>
            <div className="col">
              <div className="field">
                <select
                  className="form-control"
                  name="gender"
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
          <div className="field space">
            <input type="submit" value="Register Now" />
          </div>
        </form>
        <div className="signup space">
          Already have an account?
          <a href="/login">Login</a>
        </div>
      </div>
    </div>
  );
}

export default Register;
