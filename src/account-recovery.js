import { supabase } from './supabase'

if (supabase) {
  const style = document.createElement('style')
  style.textContent = `
    #stockhub-account-button{position:fixed;right:20px;bottom:20px;z-index:80;background:#111c2c;color:#dce8f7;border:1px solid #31445d;border-radius:9px;padding:10px 14px;font:600 13px system-ui;cursor:pointer;box-shadow:0 8px 24px #0006}
    #stockhub-account-button:hover{background:#17253a}
    .stockhub-pw-backdrop{position:fixed;inset:0;z-index:100;background:#000a;display:grid;place-items:center;padding:20px}
    .stockhub-pw-card{width:min(430px,100%);background:#0f1928;color:#eaf2ff;border:1px solid #2c405a;border-radius:14px;padding:24px;box-shadow:0 20px 60px #0009;font-family:system-ui}
    .stockhub-pw-card h2{margin:0 0 8px}.stockhub-pw-card p{color:#91a6bf;font-size:13px}.stockhub-pw-card input{box-sizing:border-box;width:100%;background:#09111d;color:#fff;border:1px solid #31445d;border-radius:8px;padding:11px 12px;margin:6px 0 12px}
    .stockhub-pw-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}.stockhub-pw-actions button,.stockhub-forgot{border:1px solid #31445d;border-radius:8px;padding:9px 12px;background:#111c2c;color:#dce8f7;cursor:pointer}.stockhub-pw-actions .primary{background:#3567e8;border-color:#3567e8;color:#fff}
    .stockhub-forgot{width:100%;margin-top:10px;background:transparent;border:0;color:#8fb0ff;text-decoration:underline;padding:5px}
    .stockhub-pw-error{color:#ff9ca8!important}.stockhub-pw-success{color:#88e0a4!important}
  `
  document.head.appendChild(style)

  function showPasswordDialog(recovery = false) {
    if (document.querySelector('.stockhub-pw-backdrop')) return
    const back = document.createElement('div')
    back.className = 'stockhub-pw-backdrop'
    back.innerHTML = `
      <div class="stockhub-pw-card">
        <h2>${recovery ? 'Create a new password' : 'Change password'}</h2>
        <p>${recovery ? 'Your recovery link signed you in. Set the password you want to use for StockHub.' : 'Enter the new password you want to use for StockHub.'}</p>
        <label>New password</label><input id="stockhub-new-password" type="password" autocomplete="new-password" minlength="8" />
        <label>Confirm password</label><input id="stockhub-confirm-password" type="password" autocomplete="new-password" minlength="8" />
        <p id="stockhub-pw-message"></p>
        <div class="stockhub-pw-actions"><button id="stockhub-pw-cancel">Cancel</button><button class="primary" id="stockhub-pw-save">Save password</button></div>
      </div>`
    document.body.appendChild(back)
    const msg = back.querySelector('#stockhub-pw-message')
    back.querySelector('#stockhub-pw-cancel').onclick = () => back.remove()
    back.querySelector('#stockhub-pw-save').onclick = async () => {
      const p1 = back.querySelector('#stockhub-new-password').value
      const p2 = back.querySelector('#stockhub-confirm-password').value
      msg.className = 'stockhub-pw-error'
      if (p1.length < 8) { msg.textContent = 'Use at least 8 characters.'; return }
      if (p1 !== p2) { msg.textContent = 'The passwords do not match.'; return }
      msg.textContent = 'Saving…'
      const { error } = await supabase.auth.updateUser({ password: p1 })
      if (error) { msg.textContent = error.message; return }
      msg.className = 'stockhub-pw-success'
      msg.textContent = 'Password updated.'
      setTimeout(() => back.remove(), 900)
    }
  }

  function setAccountButton(session) {
    let b = document.getElementById('stockhub-account-button')
    if (!session) { b?.remove(); return }
    if (!b) {
      b = document.createElement('button')
      b.id = 'stockhub-account-button'
      b.textContent = 'Change password'
      b.onclick = () => showPasswordDialog(false)
      document.body.appendChild(b)
    }
  }

  async function addForgotPassword() {
    const card = document.querySelector('.login-card')
    if (!card || document.getElementById('stockhub-forgot-password')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.id = 'stockhub-forgot-password'
    button.className = 'stockhub-forgot'
    button.textContent = 'Forgot password?'
    button.onclick = async () => {
      const email = card.querySelector('input[type="email"]')?.value?.trim()
      if (!email) { alert('Enter your email address first.'); return }
      button.disabled = true
      button.textContent = 'Sending reset email…'
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (error) alert(error.message)
      else alert('Password reset email sent. Use the new link in that email.')
      button.disabled = false
      button.textContent = 'Forgot password?'
    }
    card.appendChild(button)
  }

  supabase.auth.getSession().then(({ data }) => setAccountButton(data.session))
  supabase.auth.onAuthStateChange((event, session) => {
    setAccountButton(session)
    if (event === 'PASSWORD_RECOVERY') showPasswordDialog(true)
    setTimeout(addForgotPassword, 0)
  })

  const observer = new MutationObserver(() => addForgotPassword())
  observer.observe(document.body, { childList: true, subtree: true })
  addForgotPassword()
}
