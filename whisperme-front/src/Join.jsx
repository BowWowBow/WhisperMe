import { useState } from "react";

const API_BASE = "http://localhost:8083";

function Join() {
  const [form, setForm] = useState({
    loginId: "",
    password: "",
    nickname: "",
    birthDate: "",
    region: "",
  });

  const join = async () => {
    if (
      !form.loginId ||
      !form.password ||
      !form.nickname ||
      !form.birthDate ||
      !form.region
    ) {
      alert("모든 항목을 입력해주세요.");
      return;
    }

    const res = await fetch(`${API_BASE}/api/member/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const result = await res.text();

    alert(result);

    window.location.href = "/login";
  };

  return (
    <div className="join-container">
      <h1>회원가입</h1>

      <input
        placeholder="아이디"
        onChange={(e) =>
          setForm({ ...form, loginId: e.target.value })
        }
      />

      <input
        type="password"
        placeholder="비밀번호"
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
      />

      <input
        placeholder="닉네임"
        onChange={(e) =>
          setForm({ ...form, nickname: e.target.value })
        }
      />

      <input
        type="date"
        onChange={(e) =>
          setForm({ ...form, birthDate: e.target.value })
        }
      />

      <select
        onChange={(e) =>
          setForm({ ...form, region: e.target.value })
        }
      >
        <option value="">지역 선택</option>
        <option>서울</option>
        <option>부산</option>
        <option>대구</option>
        <option>인천</option>
        <option>광주</option>
        <option>대전</option>
        <option>울산</option>
        <option>창원</option>
        <option>김해</option>
      </select>

      <button onClick={join}>회원가입</button>
    </div>
  );
}

export default Join;