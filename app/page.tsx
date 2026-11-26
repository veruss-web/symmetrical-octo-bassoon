'use client';

import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { ConfigError, Login, ResetPassword } from '@/components/auth/login';
import { Dashboard } from '@/components/dashboard/dashboard';
import { BootShell } from '@/components/shared/boot-shell';
import { peekStoredSession } from '@/lib/auth';
import { DEMO_EMAIL, DEMO_USER_ID, isDemoActive, startDemo, stopDemo, subscribeDemo } from '@/lib/demo/mode';

// Typing the emailed reset code signs the client in. This flag (kept per tab) keeps them on the "new password" screen
// even if they reload the page before choosing a password, instead of dropping them into the dashboard.
const RECOVERY_KEY = 'mieflow:recovery';

function rememberRecovery(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(RECOVERY_KEY, '1');
    else window.sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    // storage blocked (private mode): the flag is only a convenience
  }
}

export default function Home(){
 const [session,setSession]=useState<any>(null),[authLoading,setAuthLoading]=useState(true);
 // true while the client is on the "set a new password" screen: after typing the emailed code, or after opening an older reset link
 const [recovery,setRecoveryState]=useState(false);
 const setRecovery=useCallback((on:boolean)=>{setRecoveryState(on);rememberRecovery(on)},[]);
 // The 5-minute demo: fake session + in-memory data (lib/demo). `run` changes on every (re)start so the dashboard remounts with fresh data.
 const [demo,setDemo]=useState<{endsAt:number;run:number}|null>(null);
 const beginDemo=useCallback(()=>{
  const started=startDemo();
  setRecoveryState(false);
  setSession({access_token:'demo',refresh_token:'demo',user:{id:DEMO_USER_ID,email:DEMO_EMAIL}});
  setDemo(started);setAuthLoading(false);
 },[]);
 const endDemo=useCallback(()=>{
  stopDemo();
  // the address may carry ?demo=1 (a link to share): drop it so a reload does not start the demo again
  try{window.history.replaceState(null,'',window.location.pathname)}catch{}
 },[]);
 // The demo ends from inside too (Keluar in Pengaturan): whoever stops it, the page goes back to the sign-in screen.
 useEffect(()=>subscribeDemo(()=>{if(!isDemoActive()){setDemo(null);setSession(null)}}),[]);
 useEffect(()=>{
  // https://your-site/?demo=1 opens the demo straight away: a link that can be sent to a client.
  if(new URLSearchParams(window.location.search).get('demo')==='1'){beginDemo();return;}
  if(!isSupabaseConfigured){setAuthLoading(false);return;}
  let remembered=false;
  try{remembered=window.sessionStorage.getItem(RECOVERY_KEY)==='1'}catch{}
  const resetting=remembered||/type=recovery/.test(window.location.hash);
  if(resetting)setRecoveryState(true);
  // Paint the app at once from the session stored on this device. getSession() below may have to refresh an expired token over the
  // network first (the "Memuat…" wait when a website was last opened over an hour ago); it still confirms or corrects this a moment later.
  // Not while a reset link / code is being handled: that flow must decide for itself.
  if(!resetting&&!/access_token|error_description|[#&?]code=/.test(window.location.hash+window.location.search)){
   let stored:ReturnType<typeof peekStoredSession>=null;
   try{stored=peekStoredSession(window.localStorage)}catch{}
   if(stored){setSession(stored);setAuthLoading(false)}
  }
  supabase.auth.getSession().then(({data})=>{
   if(isDemoActive())return; // the demo was started while this was still answering: the demo session stays
   // A reset flag without a session (expired link, abandoned reset) must not hijack the next normal sign-in.
   if(!data.session)setRecovery(false);
   setSession(data.session);setAuthLoading(false)
  });
  const {data}=supabase.auth.onAuthStateChange((event,s)=>{
   if(isDemoActive())return; // a real token refresh must never replace the demo session
   // The emailed code and the reset link both sign the user in; without this they would land in the dashboard without choosing a new password.
   if(event==='PASSWORD_RECOVERY')setRecovery(true);
   if(event==='SIGNED_OUT')setRecovery(false);
   setSession(s);
  });
  return()=>data.subscription.unsubscribe();
 },[setRecovery,beginDemo]);
 if(!isSupabaseConfigured&&!demo)return <ConfigError onDemo={beginDemo}/>;
 if(authLoading)return <BootShell/>;
 if(!session)return <Login onRecoveryStart={()=>setRecovery(true)} onRecoveryCancel={()=>setRecovery(false)} onDemo={beginDemo}/>;
 if(recovery&&!demo)return <ResetPassword email={session.user?.email} onDone={()=>setRecovery(false)}/>;
 return <Dashboard key={demo?`demo-${demo.run}`:'live'} session={session} demo={demo?{endsAt:demo.endsAt,onRestart:beginDemo,onExit:endDemo}:undefined}/>;
}
