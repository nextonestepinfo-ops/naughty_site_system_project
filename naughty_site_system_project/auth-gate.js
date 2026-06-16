(function () {
  const AUTH_KEY = "naughty.auth.v1";
  const PASS_HASH = "9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0";
  const script = document.currentScript;
  const redirect = script?.dataset.redirect || "";

  const ready = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  };

  const unlock = () => {
    sessionStorage.setItem(AUTH_KEY, "ok");
    document.documentElement.classList.remove("auth-pending");
    document.querySelector(".auth-gate")?.remove();
    if (redirect) location.replace(redirect);
  };

  const sha256 = async (value) => {
    if (!window.crypto?.subtle) return value === "0000" ? PASS_HASH : "";
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const mount = () => {
    if (sessionStorage.getItem(AUTH_KEY) === "ok") {
      unlock();
      return;
    }

    const gate = document.createElement("section");
    gate.className = "auth-gate";
    gate.setAttribute("aria-label", "password");
    gate.innerHTML = `
      <div class="auth-panel">
        <p class="auth-kicker">private preview</p>
        <h1 class="auth-title">naughty</h1>
        <p class="auth-copy">パスワードを入力してください。</p>
        <form class="auth-form">
          <input class="auth-input" type="password" inputmode="numeric" autocomplete="off" maxlength="12" aria-label="password" />
          <button class="auth-submit" type="submit">ENTER</button>
          <p class="auth-error" aria-live="polite"></p>
        </form>
      </div>
    `;
    document.body.appendChild(gate);

    const input = gate.querySelector(".auth-input");
    const error = gate.querySelector(".auth-error");
    gate.querySelector(".auth-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (await sha256(value) === PASS_HASH) {
        unlock();
        return;
      }
      error.textContent = "パスワードが違います";
      input.select();
    });
    input.focus();
  };

  ready(mount);
})();
