import { useState } from "react";

const API_BASE = "http://43.203.123.217:8083";

function Login() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await fetch(`${API_BASE}/api/member/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        loginId,
        password,
      }),
    });

    if (!res.ok) {
      alert("로그인 실패");
      return;
    }

    const member = await res.json();

    localStorage.setItem(
        "loginMember",
        JSON.stringify(member)
    );

    window.location.href = "/";
  };

  return (
      <div className="login-page">
        <div className="login-container">
          <h1>WhisperMe</h1>

          <input
              placeholder="아이디"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
          />

          <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={login}>로그인</button>
        </div>
      </div>
  );
}

export default Login;