import React from 'react';
import {Drop,PersonSimpleWalk,PersonSimpleTaiChi,Eye,Barbell,Pill,Alarm,Heart,Coffee,BookOpen,Brain,Target,Lightbulb,Rocket,Star,Flag,Fire,Leaf,Tree,Sun,Moon,Cloud,Lightning,House,Briefcase,GraduationCap,Wallet,Receipt,ShoppingCart,Airplane,MapPin,Camera,MusicNote,Headphones,GameController,PaintBrush,Code,Terminal,Laptop,DeviceMobile,Gear,Wrench,Flask,Bug,Globe,Lock,Key,Envelope,Phone,ChatCircle,Users,Gift,Cake,ForkKnife,Bicycle,Car,Basketball,Trophy,Calendar,Clock,Timer,Notebook,Note,Bookmark,Tag,Folder,Image,FilmStrip,Microphone,Sparkle,Atom,Compass,Mountains,Plant,PawPrint,Smiley,CheckCircle,ListChecks,ChartLineUp,Bank,PiggyBank,Handshake,Buildings,Stethoscope,Sneaker,Palette,Bed,Tooth} from '@phosphor-icons/react';

// Pages, repeaters and anything else that wants a small picture use these line icons, never emoji.
export const ICONS={
 note:Note,notebook:Notebook,book:BookOpen,bookmark:Bookmark,folder:Folder,tag:Tag,flag:Flag,star:Star,heart:Heart,target:Target,
 idea:Lightbulb,sparkle:Sparkle,rocket:Rocket,fire:Fire,lightning:Lightning,brain:Brain,atom:Atom,flask:Flask,compass:Compass,
 home:House,work:Briefcase,school:GraduationCap,building:Buildings,bank:Bank,wallet:Wallet,receipt:Receipt,piggy:PiggyBank,chart:ChartLineUp,handshake:Handshake,cart:ShoppingCart,gift:Gift,
 code:Code,terminal:Terminal,laptop:Laptop,phone:DeviceMobile,call:Phone,mail:Envelope,chat:ChatCircle,people:Users,globe:Globe,lock:Lock,key:Key,gear:Gear,tools:Wrench,bug:Bug,
 camera:Camera,image:Image,film:FilmStrip,music:MusicNote,headphones:Headphones,mic:Microphone,game:GameController,paint:PaintBrush,palette:Palette,
 sun:Sun,moon:Moon,cloud:Cloud,leaf:Leaf,tree:Tree,plant:Plant,mountain:Mountains,pet:PawPrint,
 food:ForkKnife,coffee:Coffee,cake:Cake,travel:Airplane,map:MapPin,bike:Bicycle,car:Car,sport:Basketball,trophy:Trophy,
 calendar:Calendar,clock:Clock,timer:Timer,alarm:Alarm,list:ListChecks,done:CheckCircle,smile:Smiley,
 water:Drop,walk:PersonSimpleWalk,stretch:PersonSimpleTaiChi,eyes:Eye,gym:Barbell,pill:Pill,health:Stethoscope,shoe:Sneaker,sleep:Bed,tooth:Tooth
};
export const ICON_NAMES=Object.keys(ICONS);
export function Glyph({name,size=18,weight='duotone',className}){
 const I=ICONS[name];
 return I?<I size={size} weight={weight} className={className} aria-hidden="true"/>:null;
}
// Icons that suit repeaters (water, walking, posture and so on).
export const REPEATER_ICONS=['water','walk','stretch','eyes','pill','coffee','food','gym','sleep','tooth','health','brain','book','plant','alarm','sport'];
