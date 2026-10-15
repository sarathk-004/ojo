export const android=!!window.TnkrAndroid;
export const widgetPanel=new URLSearchParams(location.search).has('widgetPanel');
export const mobile=android||new URLSearchParams(location.search).has('mobile');
let revision=0;
export function loadMobile(){if(!android)return JSON.parse(localStorage.getItem('tnkr-mobile')||'null');const result=JSON.parse(window.TnkrAndroid.load());if(result.error)throw Error(result.error);revision=result.revision;return result.state;}
export function saveMobile(state){if(!android){localStorage.setItem('tnkr-mobile',JSON.stringify(state));return;}const result=JSON.parse(window.TnkrAndroid.save(JSON.stringify(state),revision));if(!result.ok){window.dispatchEvent(new Event('tnkr-resume'));throw Error(result.error||'Your widget changed. The latest tasks have been reloaded.');}revision=result.revision;}
export function requestNotifications(){if(android)window.TnkrAndroid.requestNotifications();}
export function requestWidget(){if(android)window.TnkrAndroid.pinWidget();}
export function requestExactReminders(){if(android)window.TnkrAndroid.exactReminders();}
