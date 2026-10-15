import React,{useEffect,useState} from 'react';
import {useFileUrl} from './hooks.js';
import {GoogleLogo} from '@phosphor-icons/react';
import {siAmazonprime,siOpenai,siCanva,siAdobe,siMicrosoftoffice,siXbox,siSlack,siLinkedin,siMicrosoftteams} from 'simple-icons-v9';
import {siNetflix,siSpotify,siYoutube,siYoutubemusic,siAppletv,siApplemusic,siApplearcade,siIcloud,siGooglegemini,siGithub,siGithubcopilot,siNotion,siLoom,siPerplexity,siCursor,siLinear,siRaycast,siObsidian,siDropbox,siZoom,siDuolingo,siAirtel,siJio,siSwiggy,siZomato,siAudible,siMedium,siClaude,siFigma,siPlaystation,siSteam,siCrunchyroll,siMax,siParamountplus,siTwitch,siPatreon,siSubstack,siTelegram,siTidal,siDeezer,siSoundcloud,siNordvpn,siExpressvpn,siProton,siDashlane,siBitwarden,si1password,siLastpass,siEvernote,siTodoist,siTicktick,siGrammarly,siCoursera,siUdemy,siSkillshare,siUnacademy,siByjus,siHeadspace,siStrava,siPeloton,siFitbit,siGarmin,siAirtable,siAsana,siTrello,siJira,siBox,siWebflow,siSupabase,siReplit,siHuggingface,siMailchimp,siZapier,siCalendly,siTypeform,siMiro,siElevenlabs,siSuno,siDeepseek,siUber,siPaytm,siPhonepe,siGooglepay,siZerodha,siNamecheap,siGodaddy,siCloudflare,siVercel,siGooglecloud,siSquarespace,siWix,siShopify,siTailscale,siHostinger,siDigitalocean,siGmail,siBrave} from 'simple-icons';

// Services people pay for every month, so a bill can wear the logo of the thing it is for.
// Shapes come from the Simple Icons set (CC0). The marks belong to their owners and are shown only to identify the service.
// Official logos that are not in that set (Prime Video, ChatGPT, Hotstar, Canva, Wynk, Granola and others) can be dropped into
// src/workspace/brand-logos/<id>.svg, or uploaded per bill with "Upload logo". Until then those services show a plain initial.
// `f` marks the ones offered first when adding a bill.
const B=(id,name,color,icon,cat,aliases=[],f=false,letter)=>({id,name,color,icon,category:cat,aliases:[name.toLowerCase(),...aliases],featured:f,letter:letter||name[0].toUpperCase()});
// D tags a brand with the website whose own icon is fetched (once) when someone picks it, instead of a shape drawn here.
const D=(domain,brand)=>({...brand,domain});
export const BRANDS=[
 B('netflix','Netflix','#E50914',siNetflix,'fun',[],true),
 B('spotify','Spotify','#1DB954',siSpotify,'fun',[],true),
 B('youtube','YouTube Premium','#FF0000',siYoutube,'fun',['youtube'],true),
 D('primevideo.com',B('prime','Amazon Prime','#00A8E1',null,'fun',['prime video','amazon prime','prime'],true)),
 D('hotstar.com',B('hotstar','JioHotstar','#1F3A8A',null,'fun',['hotstar','disney+','disney plus','jiohotstar'],true,'H')),
 B('applemusic','Apple Music','#FA243C',siApplemusic,'fun',[],true),
 B('appletv','Apple TV+','#1D1D1F',siAppletv,'fun',['apple tv'],true),
 B('icloud','iCloud','#3693F3',siIcloud,'bills',['icloud+'],true),
 D('one.google.com',B('googleone','Google One','#4285F4',null,'bills',['google storage','google'],true)),
 D('chatgpt.com',B('chatgpt','ChatGPT','#10A37F',null,'bills',['openai','chat gpt'],true)),
 B('claude','Claude','#D97757',siClaude,'bills',['anthropic'],true),
 D('gemini.google',B('gemini','Gemini','#8E75B2',null,'bills',['google gemini','google ai'],true)),
 B('perplexity','Perplexity','#1FB8CD',siPerplexity,'bills',[],false),
 B('cursor','Cursor','#000000',siCursor,'bills',[],false),
 B('copilot','GitHub Copilot','#000000',siGithubcopilot,'bills',['copilot'],false),
 B('notion','Notion','#000000',siNotion,'bills',[],true),
 B('loom','Loom','#625DF5',siLoom,'bills',[],true),
 D('canva.com',B('canva','Canva','#00C4CC',null,'bills',[],true)),
 D('granola.ai',B('granola','Granola','#6B8F3A',null,'bills',[],false,'G')),
 B('figma','Figma','#F24E1E',siFigma,'bills',[],false),
 B('linear','Linear','#5E6AD2',siLinear,'bills',[]),
 B('raycast','Raycast','#FF6363',siRaycast,'bills',[]),
 B('obsidian','Obsidian','#7C3AED',siObsidian,'bills',[]),
 B('airtable','Airtable','#18BFFF',siAirtable,'bills',[]),
 B('asana','Asana','#F06A6A',siAsana,'bills',[]),
 B('trello','Trello','#0052CC',siTrello,'bills',[]),
 B('jira','Jira','#0052CC',siJira,'bills',[]),
 B('miro','Miro','#FFD02F',siMiro,'bills',[]),
 B('zapier','Zapier','#FF4F00',siZapier,'bills',[]),
 B('calendly','Calendly','#006BFF',siCalendly,'bills',[]),
 B('typeform','Typeform','#262627',siTypeform,'bills',[]),
 B('mailchimp','Mailchimp','#FFE01B',siMailchimp,'bills',[]),
 D('microsoft365.com',B('microsoft365','Microsoft 365','#D83B01',null,'bills',['office 365','microsoft office','microsoft'],false)),
 B('teams','Microsoft Teams','#6264A7',siMicrosoftteams,'bills',['teams']),
 D('slack.com',B('slack','Slack','#4A154B',null,'bills',[])),
 B('linkedin','LinkedIn Premium','#0A66C2',siLinkedin,'bills',['linkedin']),
 D('adobe.com',B('adobe','Adobe','#FA0F00',null,'bills',['creative cloud','photoshop'],false)),
 B('dropbox','Dropbox','#0061FF',siDropbox,'bills',[]),
 B('box','Box','#0061D5',siBox,'bills',[]),
 B('github','GitHub','#181717',siGithub,'bills',[]),
 B('huggingface','Hugging Face','#FFD21E',siHuggingface,'bills',[]),
 B('replit','Replit','#F26207',siReplit,'bills',[]),
 B('supabase','Supabase','#3FCF8E',siSupabase,'bills',[]),
 B('webflow','Webflow','#146EF5',siWebflow,'bills',[]),
 B('elevenlabs','ElevenLabs','#000000',siElevenlabs,'bills',[]),
 B('suno','Suno','#000000',siSuno,'bills',[]),
 B('deepseek','DeepSeek','#4D6BFE',siDeepseek,'bills',[]),
 B('zoom','Zoom','#0B5CFF',siZoom,'bills',[]),
 B('evernote','Evernote','#00A82D',siEvernote,'bills',[]),
 B('todoist','Todoist','#E44332',siTodoist,'bills',[]),
 B('ticktick','TickTick','#4772FA',siTicktick,'bills',[]),
 B('grammarly','Grammarly','#14A44D',siGrammarly,'bills',[]),
 B('youtubemusic','YouTube Music','#FF0000',siYoutubemusic,'fun',[]),
 B('applearcade','Apple Arcade','#1D1D1F',siApplearcade,'fun',[]),
 D('sonyliv.com',B('sonyliv','SonyLIV','#111111',null,'fun',['sony liv'],false,'S')),
 D('zee5.com',B('zee5','ZEE5','#8230C6',null,'fun',['zee 5'],false,'Z')),
 D('jiocinema.com',B('jiocinema','JioCinema','#D9188E',null,'fun',['jio cinema'],false,'J')),
 B('max','HBO Max','#002BE7',siMax,'fun',['hbo','max']),
 B('paramount','Paramount+','#0064FF',siParamountplus,'fun',['paramount']),
 B('crunchyroll','Crunchyroll','#F47521',siCrunchyroll,'fun',[]),
 B('twitch','Twitch','#9146FF',siTwitch,'fun',[]),
 B('audible','Audible','#F8991C',siAudible,'learning',[]),
 B('tidal','Tidal','#000000',siTidal,'fun',[]),
 B('deezer','Deezer','#A238FF',siDeezer,'fun',[]),
 B('soundcloud','SoundCloud','#FF5500',siSoundcloud,'fun',[]),
 D('jiosaavn.com',B('jiosaavn','JioSaavn','#2BC5B4',null,'fun',['saavn'],false,'S')),
 D('wynk.in',B('wynk','Wynk Music','#1E88E5',null,'fun',['wynk'],false,'W')),
 B('playstation','PlayStation','#0070D1',siPlaystation,'fun',['ps plus','psn']),
 B('steam','Steam','#171A21',siSteam,'fun',[]),
 D('xbox.com',B('xbox','Xbox Game Pass','#107C10',null,'fun',['game pass','xbox'],false)),
 B('patreon','Patreon','#FF424D',siPatreon,'fun',[]),
 B('duolingo','Duolingo','#58CC02',siDuolingo,'learning',[],true),
 B('coursera','Coursera','#0056D2',siCoursera,'learning',[]),
 B('udemy','Udemy','#A435F0',siUdemy,'learning',[]),
 B('skillshare','Skillshare','#00FF84',siSkillshare,'learning',[]),
 B('unacademy','Unacademy','#08BD80',siUnacademy,'learning',[]),
 B('byjus','BYJU\'S','#813588',siByjus,'learning',['byjus']),
 B('medium','Medium','#000000',siMedium,'learning',[]),
 B('substack','Substack','#FF6719',siSubstack,'learning',[]),
 B('headspace','Headspace','#F47D31',siHeadspace,'health',[]),
 B('strava','Strava','#FC4C02',siStrava,'health',[]),
 B('peloton','Peloton','#000000',siPeloton,'health',[]),
 B('fitbit','Fitbit','#00B0B9',siFitbit,'health',[]),
 B('garmin','Garmin','#000000',siGarmin,'health',[]),
 B('telegram','Telegram Premium','#26A5E4',siTelegram,'bills',['telegram']),
 B('airtel','Airtel','#E40000',siAirtel,'bills',['airtel xstream','airtel broadband','airtel postpaid','airtel recharge','airtel black','airtel fiber'],true),
 B('jio','Jio','#0A2885',siJio,'bills',['jiofiber','jio fiber','jio recharge','jio postpaid','jio airfiber','jio air fiber','reliance jio'],true),
 B('swiggy','Swiggy One','#FC8019',siSwiggy,'food',['swiggy']),
 B('zomato','Zomato Gold','#E23744',siZomato,'food',['zomato']),
 B('uber','Uber One','#000000',siUber,'transport',['uber']),
 B('paytm','Paytm','#00BAF2',siPaytm,'bills',[]),
 B('phonepe','PhonePe','#5F259F',siPhonepe,'bills',[]),
 B('googlepay','Google Pay','#4285F4',siGooglepay,'bills',['gpay']),
 B('zerodha','Zerodha','#387ED1',siZerodha,'bills',[]),
 B('nordvpn','NordVPN','#4687FF',siNordvpn,'bills',[]),
 B('expressvpn','ExpressVPN','#DA3940',siExpressvpn,'bills',[]),
 B('tailscale','Tailscale','#242424',siTailscale,'bills',[]),
 B('proton','Proton','#6D4AFF',siProton,'bills',['proton mail','protonmail']),
 B('bitwarden','Bitwarden','#175DDC',siBitwarden,'bills',[]),
 B('1password','1Password','#0572EC',si1password,'bills',['one password']),
 B('dashlane','Dashlane','#0E353D',siDashlane,'bills',[]),
 B('lastpass','LastPass','#D32D27',siLastpass,'bills',[]),
 B('gmail','Google Workspace','#EA4335',siGmail,'bills',['gmail','g suite','workspace']),
 B('namecheap','Namecheap','#DE3723',siNamecheap,'bills',['domain']),
 B('godaddy','GoDaddy','#1BDBDB',siGodaddy,'bills',[]),
 B('hostinger','Hostinger','#673DE6',siHostinger,'bills',[]),
 B('cloudflare','Cloudflare','#F38020',siCloudflare,'bills',[]),
 B('vercel','Vercel','#000000',siVercel,'bills',[]),
 B('digitalocean','DigitalOcean','#0080FF',siDigitalocean,'bills',[]),
 B('googlecloud','Google Cloud','#4285F4',siGooglecloud,'bills',['gcp']),
 B('squarespace','Squarespace','#000000',siSquarespace,'bills',[]),
 B('wix','Wix','#0C6EFC',siWix,'bills',[]),
 B('shopify','Shopify','#7AB55C',siShopify,'bills',[]),
 B('brave','Brave','#FB542B',siBrave,'bills',[])
];

// Official logo files dropped into src/workspace/brand-logos (named after the service id) take over from the drawn shape or initial.
const files=import.meta.glob('./brand-logos/*.{svg,png,webp,ico,jpg}',{eager:true,query:'?url',import:'default'});
const FILE_LOGOS=Object.fromEntries(Object.entries(files).map(([p,url])=>[p.split('/').pop().replace(/\.[a-z]+$/,'').toLowerCase(),url]));
for(const b of BRANDS)b.logoUrl=FILE_LOGOS[b.id]||null;

// Icons fetched from a service's own website are kept as files; this remembers which file belongs to which service.
let LOGO_CACHE={};const subs=new Set();
export const setBrandLogoCache=map=>{LOGO_CACHE=map||{};subs.forEach(f=>f());};
export function useBrandLogoCache(){
 const [,tick]=useState(0);
 useEffect(()=>{const f=()=>tick(n=>n+1);subs.add(f);return()=>{subs.delete(f);};},[]);
 return LOGO_CACHE;
}
function CachedLogo({fileId,size,radius,className}){
 const url=useFileUrl(fileId,'image/*');
 return <span className={'brand-logo brand-file '+className} style={{width:size,height:size,borderRadius:radius}} aria-hidden="true">{url&&<img src={url} alt="" width={Math.round(size*.72)} height={Math.round(size*.72)}/>}</span>;
}
export const brandById=id=>BRANDS.find(b=>b.id===id)||null;
export const FEATURED=BRANDS.filter(b=>b.featured);
// Search by name or alias ("hot" -> Disney+ Hotstar).
export const searchBrands=q=>{
 const s=String(q||'').toLowerCase().trim();
 if(!s)return FEATURED;
 return BRANDS.filter(b=>b.aliases.some(a=>a.includes(s)));
};

// Finds the service a bill is for from its saved brand or just from the name typed ("netflix family plan" -> Netflix).
export function matchBrand(bill){
 if(!bill)return null;
 const direct=bill.brand&&brandById(bill.brand);
 if(direct)return direct;
 const name=String(bill.name||'').toLowerCase().trim();
 if(name.length<3)return null;
 let best=null,len=0;
 for(const b of BRANDS)for(const a of b.aliases){
  if(a.length>=3&&a.length>len&&(name===a||name.includes(a)||(name.length>=4&&a.startsWith(name))))best=b,len=a.length;
 }
 return best;
}

// The logo: an official file if one was supplied, otherwise the drawn shape in white on the service's colour, otherwise its initial.
export function BrandBadge({brand,size=36,className=''}){
 const radius=Math.round(size*.28),cache=useBrandLogoCache();
 if(brand.domain&&cache[brand.id])return <CachedLogo fileId={cache[brand.id]} size={size} radius={radius} className={className}/>;
 if(brand.logoUrl)return <span className={'brand-logo brand-file '+className} style={{width:size,height:size,borderRadius:radius}} aria-hidden="true"><img src={brand.logoUrl} alt="" width={Math.round(size*.72)} height={Math.round(size*.72)}/></span>;
 return (
  <span className={'brand-logo '+className} style={{width:size,height:size,borderRadius:radius,background:brand.color}} aria-hidden="true">
   {brand.icon&&brand.icon.component
    ?<brand.icon.component size={Math.round(size*.58)} color="#fff" weight="bold"/>
    :brand.icon
    ?<svg viewBox="0 0 24 24" width={Math.round(size*.58)} height={Math.round(size*.58)} fill="#fff"><path d={brand.icon.path}/></svg>
    :<b style={{fontSize:Math.round(size*.46)}}>{brand.letter}</b>}
  </span>
 );
}

// A logo the person uploaded for one bill.
export function CustomLogo({url,size=36,className=''}){
 return <span className={'brand-logo brand-file '+className} style={{width:size,height:size,borderRadius:Math.round(size*.28)}} aria-hidden="true">{url&&<img src={url} alt="" width={Math.round(size*.72)} height={Math.round(size*.72)}/>}</span>;
}
