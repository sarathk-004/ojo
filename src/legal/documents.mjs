// The wording of ojo's Privacy Notice, Terms of Use and third-party notices. One source: the app, the installer and docs/ all read it.
// This is plain-language drafting written to match what the app really does. It is not legal advice; have a lawyer review it before wide distribution.
import {PUBLISHER,CONTACT_EMAIL,GOVERNING_LAW,LEGAL_VERSION,EFFECTIVE} from './info.mjs';

export const contactLine=()=>CONTACT_EMAIL?'You can reach the publisher at '+CONTACT_EMAIL+'.':'Contact details are listed wherever you downloaded ojo from.';

export const PRIVACY={
 id:'privacy',title:'Privacy Notice',
 summary:'ojo keeps everything on your computer. '+PUBLISHER+' does not receive, collect, sell or share your data. There is no account, no analytics, no tracking and no cloud.',
 sections:[
  {h:'The short version',list:[
   'We cannot see or read your data. It never leaves your device and the publisher has no access to it. When this notice says "ojo reads" something, it means the app running on your own computer opens it for you.',
   'Your tasks, notes, files and money entries stay on this computer. They are never sent to us.',
   'There is no sign-up, no analytics, no crash reports, no advertising and no cloud sync.',
   'ojo only goes online when you ask it to open or read a link you saved, and then it talks straight to that website, not to us.',
   'You can take a copy of all your data or erase all of it at any time from Settings.'
  ]},
  {h:'What ojo keeps on your device',p:['To do its job ojo stores what you type or add: tasks and their history, notes (with pictures you add), calendar events, saved links, files and PDFs (with your reading position and highlights), finance entries, budgets and bills, job applications, focus sessions, repeating reminders, weekly reviews, and settings such as theme, currency and sidebar order.','On Windows this lives in your user profile, in the folder %APPDATA%\\Taskit. ojo does not encrypt it; it is protected by your Windows account. Anyone who can sign in as you can read it, so keep your device locked and consider turning on Windows device encryption (BitLocker).']},
  {h:'When ojo uses the internet',p:['Only when you save or open something, and only to the place you pointed it at:'],list:[
   'Saving a link: the app on your computer visits that page directly to read its title, description and preview picture. If the link is a PDF or another file, ojo downloads it so you can read it offline.',
   'Choosing a service for a bill (Netflix, Prime Video and so on): the app asks the website of that service, once, for the icon it publishes, and keeps it on your device.',
   'Saving a YouTube link: ojo asks youtube.com for the video title and shows the thumbnail from img.youtube.com.',
   'Opening a link: it opens in your default browser.',
   'If a web PDF cannot be downloaded, ojo may show it in an online view inside the app.'
  ],after:['Those websites can see your internet address and the request, as with any visit, and their own privacy policies apply. ojo does not contact any server run by the publisher, and it does not check for updates by itself.']},
  {h:'What else the Windows app does on your computer',list:[
   'Notifications for tasks, bills, repeating reminders and budget alerts.',
   'A global keyboard shortcut (Ctrl+Shift+Space by default) for Quick capture.',
   'An optional "start with Windows" setting.',
   'Quiet mode, which holds back pop-ups, notifications and shortcuts for a while, or automatically while another app is full screen.',
   'A small helper program (DesktopWatch) that watches which window is in front, whether another app is full screen, and where you click or scroll, so the desktop widget and the top-of-screen notch can show, hide and scroll correctly. It works only on your computer. It does not record, save or send what you do.'
  ]},
  {h:'Files and statements you choose',p:['The app opens a file only when you pick, drop or paste it, and it never sends the file anywhere. Bank or payment statements you import are processed on your computer only; if a PDF needs a password, it is used once and not stored.']},
  {h:'Your choices and rights',p:['Because your data never reaches us, you already hold all of it. Settings has "Export my data" (a readable copy of everything) and "Erase all data" (deletes everything ojo stores). Uninstalling ojo does not delete your data folder unless you erase it first, so use Erase all data if you want it gone.','Where laws such as India\'s Digital Personal Data Protection Act 2023, the EU/UK GDPR or the California CCPA give you rights of access, correction, erasure or portability, you can exercise them yourself in the app. The publisher is not a controller or processor of the content you keep in ojo, because it never receives it.']},
  {h:'Other people\'s information',p:['If you put other people\'s details into ojo (for example a recruiter\'s name in the Job tracker), you are responsible for handling them properly. They stay on your device.']},
  {h:'Children',p:['ojo is not directed at children. If you are under the age of majority where you live, use it with a parent or guardian.']},
  {h:'Changes to this notice',p:['If ojo ever changes how it handles data, this notice will change before the new behaviour ships, and ojo will ask you to read it again. Version '+LEGAL_VERSION+', effective '+EFFECTIVE+'.']},
  {h:'Contact',p:[contactLine()]}
 ]
};

export const TERMS={
 id:'terms',title:'Terms of Use',
 summary:'ojo is free personal software provided as it is. Your data and your decisions stay yours. ojo is not financial, tax, legal or medical advice.',
 sections:[
  {h:'Agreeing to these terms',p:['By installing or using ojo you agree to these terms. If you do not agree, please do not use it. You must be old enough to make a binding agreement where you live, or have a parent or guardian\'s permission.']},
  {h:'What you may do',p:['ojo is free, open-source software released under the MIT licence. You may use it, copy it, change it and share it, for any purpose, as long as the licence text and copyright notice stay with it. The full text is in the LICENSE file that comes with ojo and in its public source repository. These terms add the notes below about using the app; they do not take away any right the MIT licence gives you. Parts of ojo come from other open-source and third-party projects that keep their own licences (see Open-source notices).']},
  {h:'Your content',p:['What you put into ojo is yours and stays on your device. You are responsible for it and for keeping backups (use Export my data). Only save material you have the right to keep, and respect the copyright and terms of the websites, files and PDFs you save.']},
  {h:'Not professional advice',list:[
   'Finance, budgets, bills and statement import are bookkeeping aids. They are not financial, tax, accounting or legal advice, and imported statements can be read wrongly, so check the numbers.',
   'Water, walking, posture, eye-rest, medicine and other repeating reminders are conveniences, not medical advice or a medical device. Do not rely on them for health decisions.',
   'Pop-ups and overlays: ojo can show reminders, notifications and a small notch above other windows. Before an exam, a proctored or invigilated test, a presentation or a screen share, turn on Quiet mode (tray icon or Settings) or quit ojo. You are responsible for making sure nothing from ojo can interfere, and for following the rules of any exam. Some exam or security software does not allow a desktop helper that watches clicks, so if in doubt, quit ojo.',
   'Notifications can fail (for example if the app is closed, your computer is asleep, or Focus assist or notification settings block them). Do not depend on ojo alone for deadlines, payments, medication or anything where a missed alert would cause harm.'
  ]},
  {h:'Acceptable use',p:['Do not use ojo to break the law, to store or spread unlawful material, or to harm others.']},
  {h:'Third-party websites',p:['The app on your computer can open or fetch links you give it. Those sites are not controlled by the publisher, and ojo is not responsible for them or what they contain.']},
  {h:'No warranty',p:['ojo is provided "as is" and "as available", without promises of any kind, to the fullest extent the law allows. That includes promises that it will be error-free, uninterrupted, fit for a particular purpose, or that data will never be lost.']},
  {h:'Limit of liability',p:['To the fullest extent the law allows, the publisher is not liable for indirect or consequential loss, lost data, lost profits, or missed reminders arising from use of ojo, and its total liability is limited to the amount you paid for ojo (which is nothing). Nothing in these terms limits liability that cannot be limited by law, or your statutory consumer rights.']},
  {h:'Ending',p:['You can stop using ojo and uninstall it at any time. The publisher may stop offering it or change it. Sections that by their nature should survive (such as no warranty and limit of liability) continue.']},
  {h:'Changes',p:['These terms may be updated. When they change materially, ojo will show them again and ask you to accept. Version '+LEGAL_VERSION+', effective '+EFFECTIVE+'.']},
  {h:'Governing law',p:['These terms are governed by the laws of '+GOVERNING_LAW+', and the courts there have jurisdiction, without taking away any mandatory rights you have as a consumer where you live.']},
  {h:'Contact',p:[contactLine()]}
 ]
};

export const NOTICES={
 id:'notices',title:'Open-source notices',
 summary:'ojo is built with the following projects. Each keeps its own licence and copyright.',
 sections:[
  {h:'Included software and fonts',list:[
   'React and React DOM, by Meta Platforms, Inc. and contributors, MIT licence.',
   'Electron, by the OpenJS Foundation and contributors, MIT licence. Electron includes Chromium and Node.js, which have their own licences (BSD-3-Clause, MIT and others); the full list ships with the app in LICENSES.chromium.html.',
   'pdf.js (pdfjs-dist), by Mozilla and contributors, Apache License 2.0.',
   'highlight.js, by Ivan Sagalaev and contributors, BSD-3-Clause licence.',
   'mammoth, by Michael Williamson, BSD-2-Clause licence (reads Word documents when you import them).',
   'GSAP, by GreenSock, used under the GreenSock Standard "no charge" licence (gsap.com/standard-license).',
   'Phosphor Icons (@phosphor-icons/react), by Helena Zhang and Tobias Fried, MIT licence.',
   'ojo itself, by the ojo contributors, MIT licence.',
   'Simple Icons (simple-icons, and an earlier release of it kept for logos since withdrawn), by the Simple Icons contributors, CC0 1.0 licence: the shapes used to show service logos next to bills.',
   'Geist font (@fontsource-variable/geist), by Vercel, SIL Open Font License 1.1.'
  ]},
  {h:'Trademarks',p:['Names and logos of other companies shown next to saved links and bills (such as YouTube, Instagram, X, LinkedIn, Netflix or Spotify) belong to their owners. They appear only so you can recognise the service. ojo is not affiliated with or endorsed by them.']}
 ]
};

export const DOCS=[PRIVACY,TERMS,NOTICES];

// Plain text of a document, for the installer licence page and docs/ files.
export function toText(doc){
 const out=[doc.title.toUpperCase(),'Version '+LEGAL_VERSION+' - '+PUBLISHER,'',doc.summary,''];
 for(const s of doc.sections){
  out.push(s.h,'');
  for(const p of s.p||[])out.push(p,'');
  for(const l of s.list||[])out.push('  - '+l);
  if(s.list)out.push('');
  for(const p of s.after||[])out.push(p,'');
 }
 return out.join('\n');
}
