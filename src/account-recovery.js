import { supabase } from './supabase'

if (supabase) {
  const style = document.createElement('style')
  style.textContent = `
    #stockhub-account{position:fixed;right:20px;bottom:20px;z-index:80;background:#111c2c;color:#dce8f7;border:1px solid #31445d;border-radius:9px;padding:10px 14px;font:600 13px system-ui;cursor:pointer;box-shadow:0 8px 24px #0006}
    .stockhub-backdrop{position:fixed;inset:0;z-index:100;background:#000a;display:grid;place-items:center;padding:20px}.stockhub-card{width:min(460px,100%);background:#0f1928;color:#eaf2ff;border:1px solid #2c405a;border-radius:14px;padding:24px;box-shadow:0 20px 60px #0009;font-family:system-ui}.stockhub-card input{box-sizing:border-box;width:100%;background:#09111d;color:#fff;border:1px solid #31445d;border-radius:8px;padding:11px 12px;margin:6px 0 12px}.stockhub-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px}.stockhub-actions button,.stockhub-forgot,.stockhub-passkey{border:1px solid #31445d;border-radius:8px;padding:9px 12px;background:#111c2c;color:#dce8f7;cursor:pointer}.stockhub-forgot,.stockhub-passkey{width:100%;margin-top:10px}.stockhub-forgot{background:transparent;border:0;color:#8fb0ff;text-decoration:underline}.stockhub-msg{color:#91a6bf;font-size:13px}.stockhub-error{color:#ff9ca8}.stockhub-success{color:#88e0a4}
  `
  document.head.appendChild(style)

  const dialog = (title, body) => {
    document.querySelector('.stockhub-backdrop')?.remove()
    const back=document.createElement('div'); back.className='stockhub-backdrop'
    back.innerHTML=`<div class="stockhub-card"><h2 style="margin-top:0">${title}</h2>${body}<p id="stockhub-msg" class="stockhub-msg"></p><div class="stockhub-actions"><button id="stockhub-close">Close</button></div></div>`
    document.body.appendChild(back); back.querySelector('#stockhub-close').onclick=()=>back.remove(); return back
  }

  function showPasswordDialog(recovery=false){
    const back=dialog(recovery?'Create a new password':'Account security',`<p class="stockhub-msg">Signed in as <b id="stockhub-email"></b></p><label>New password</label><input id="stockhub-p1" type="password" autocomplete="new-password" minlength="8"><label>Confirm password</label><input id="stockhub-p2" type="password" autocomplete="new-password" minlength="8"><button id="stockhub-savepw" class="stockhub-passkey">Save new password</button><button id="stockhub-registerpk" class="stockhub-passkey">Add a passkey</button>`)
    const msg=back.querySelector('#stockhub-msg')
    supabase.auth.getUser().then(({data})=>{back.querySelector('#stockhub-email').textContent=data.user?.email||'authenticated user'})
    back.querySelector('#stockhub-savepw').onclick=async()=>{
      const p1=back.querySelector('#stockhub-p1').value,p2=back.querySelector('#stockhub-p2').value
      if(p1.length<8){msg.className='stockhub-error';msg.textContent='Use at least 8 characters.';return}
      if(p1!==p2){msg.className='stockhub-error';msg.textContent='Passwords do not match.';return}
      const {error}=await supabase.auth.updateUser({password:p1});msg.className=error?'stockhub-error':'stockhub-success';msg.textContent=error?error.message:'Password updated.'
    }
    back.querySelector('#stockhub-registerpk').onclick=async()=>{
      msg.className='stockhub-msg';msg.textContent='Starting passkey registration…'
      const {data,error}=await supabase.auth.registerPasskey()
      msg.className=error?'stockhub-error':'stockhub-success';msg.textContent=error?error.message:`Passkey added${data?.friendly_name?' ('+data.friendly_name+')':''}.`
    }
  }

  async function addLoginHelpers(){
    const card=document.querySelector('.login-card'); if(!card)return
    const email=card.querySelector('input[type="email"]'),pw=card.querySelector('input[type="password"]')
    if(email){email.autocomplete='username';email.name='email'} if(pw){pw.autocomplete='current-password';pw.name='password'}
    if(!document.getElementById('stockhub-passkey-login')){
      const p=document.createElement('button');p.type='button';p.id='stockhub-passkey-login';p.className='stockhub-passkey';p.textContent='Sign in with a passkey'
      p.onclick=async()=>{p.disabled=true;const {error}=await supabase.auth.signInWithPasskey();if(error)alert(error.message);p.disabled=false}
      card.appendChild(p)
    }
    if(!document.getElementById('stockhub-forgot')){
      const b=document.createElement('button');b.type='button';b.id='stockhub-forgot';b.className='stockhub-forgot';b.textContent='Forgot password?'
      b.onclick=async()=>{const e=email?.value?.trim();if(!e){alert('Enter your email address first.');return}b.disabled=true;const {error}=await supabase.auth.resetPasswordForEmail(e,{redirectTo:window.location.origin});alert(error?error.message:'Password reset email sent.');b.disabled=false}
      card.appendChild(b)
    }
  }

  function accountButton(session){
    let b=document.getElementById('stockhub-account')
    if(!session){b?.remove();return}
    if(!b){b=document.createElement('button');b.id='stockhub-account';b.onclick=()=>showPasswordDialog(false);document.body.appendChild(b)}
    b.textContent=`Security • ${session.user?.email||'signed in'}`
  }
  supabase.auth.getSession().then(({data})=>accountButton(data.session))
  supabase.auth.onAuthStateChange((event,session)=>{accountButton(session);if(event==='PASSWORD_RECOVERY')setTimeout(()=>showPasswordDialog(true),0);setTimeout(addLoginHelpers,0)})
  new MutationObserver(addLoginHelpers).observe(document.body,{childList:true,subtree:true});addLoginHelpers()
}
