using System;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Collections.Concurrent;
class DesktopWatch {
 // Forward only wheel input
 // hit-tested to our own widget; leave every other application's input alone.
 delegate IntPtr MouseProc(int code,IntPtr message,IntPtr data);
 static MouseProc wheelProc=Wheel;
 static IntPtr wheelHook,widgetHandle;
 static readonly BlockingCollection<string> wheelMessages=new BlockingCollection<string>(256);
 [StructLayout(LayoutKind.Sequential)] struct MouseData { public Point Point; public uint Data,Flags,Time; public UIntPtr Extra; }
 [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr SetWindowsHookEx(int id,MouseProc callback,IntPtr module,uint thread);
 [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook,int code,IntPtr message,IntPtr data);
 [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(Point point);
 [DllImport("user32.dll")] static extern bool IsChild(IntPtr parent,IntPtr child);
 [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern IntPtr GetModuleHandle(string module);
 [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);
 static int lastBusy=-1,busyTick=0;
 // 1 = screen saver or locked, 2 = a full-screen app, 3 = a full-screen game, 4 = presentation mode, 6 = Focus assist: all mean "do not pop up".
 static void ReportBusy(){if(++busyTick%20!=1)return;int s;if(SHQueryUserNotificationState(out s)!=0)return;int b=(s==1||s==2||s==3||s==4||s==6)?1:0;if(b!=lastBusy){lastBusy=b;wheelMessages.TryAdd("busy:"+b);}}
 static IntPtr Wheel(int code,IntPtr message,IntPtr data){
  // Report left-button releases so the notch can react even when Windows does not deliver the click to its window.
  // A held button (for example a file being dragged) is reported too, so the notch never raises itself over the drag image.
  if(code>=0&&message.ToInt64()==0x201)wheelMessages.TryAdd("down");
  if(code>=0&&message.ToInt64()==0x205){MouseData rup=(MouseData)Marshal.PtrToStructure(data,typeof(MouseData));wheelMessages.TryAdd("rclick:"+rup.Point.X+":"+rup.Point.Y);}
  if(code>=0&&message.ToInt64()==0x202){MouseData up=(MouseData)Marshal.PtrToStructure(data,typeof(MouseData));wheelMessages.TryAdd("click:"+up.Point.X+":"+up.Point.Y);}
  if(code>=0&&(message.ToInt64()==0x20a||message.ToInt64()==0x20e)&&widgetHandle!=IntPtr.Zero){
   MouseData mouse=(MouseData)Marshal.PtrToStructure(data,typeof(MouseData));
   IntPtr target=WindowFromPoint(mouse.Point);
   Rect r;bool inside=GetWindowRect(widgetHandle,out r)&&mouse.Point.X>=r.Left&&mouse.Point.X<=r.Right&&mouse.Point.Y>=r.Top&&mouse.Point.Y<=r.Bottom;
   // Layered transparent windows can hit-test as the desktop. Never use a
   // rectangle alone: another application's window may cover this widget.
   if(IsWindowVisible(widgetHandle)&&(target==widgetHandle||IsChild(widgetHandle,target)||(inside&&DesktopClass(ClassOf(target))))){
    int delta=(short)(mouse.Data>>16);
    // Never block the hook on IPC: Windows removes slow low-level hooks.
    if(wheelMessages.TryAdd("wheel:"+mouse.Point.X+":"+mouse.Point.Y+":"+(message.ToInt64()==0x20e?delta:0)+":"+(message.ToInt64()==0x20a?delta:0)))return new IntPtr(1);
   }
  }
  return CallNextHookEx(wheelHook,code,message,data);
 }
 delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr h,int command);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int width,int height,uint flags);
 [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h,uint command);
 [DllImport("user32.dll")] static extern IntPtr GetShellWindow();
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll",EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr h,int index,IntPtr value);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string title);
 [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential)] struct Point { public int X,Y; }
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect rect);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback,IntPtr p);
 [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h,int index);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowTextLength(IntPtr h);
 [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int attr,out int value,int size);
 static string ClassOf(IntPtr h){var s=new StringBuilder(256);GetClassName(h,s,256);return s.ToString();}
 static bool DesktopClass(string c){return c=="Progman"||c=="WorkerW"||c=="SHELLDLL_DefView"||c=="SysListView32";}
 static bool ShellClass(string c){return DesktopClass(c)||c=="Shell_TrayWnd"||c=="Shell_SecondaryTrayWnd"||c=="TaskListThumbnailWnd"||c=="tooltips_class32";}
 static bool Cloaked(IntPtr h){int value;return DwmGetWindowAttribute(h,14,out value,4)==0&&value!=0;}
 static bool VisibleApp(IntPtr h,uint own){
  uint pid;GetWindowThreadProcessId(h,out pid);
  if(pid==own||!IsWindowVisible(h)||IsIconic(h)||ShellClass(ClassOf(h)))return false;
  if(Cloaked(h))return false;
  if((GetWindowLong(h,-20)&0x80)!=0||GetWindowTextLength(h)==0)return false;
  return true;
 }
 static string ReadState(uint own){
  IntPtr h=GetForegroundWindow();uint pid;GetWindowThreadProcessId(h,out pid);
  string c=ClassOf(h),root=ClassOf(GetAncestor(h,2));
  if(h!=IntPtr.Zero&&IsWindowVisible(h)&&!IsIconic(h)&&!Cloaked(h)){
   if(pid==own)return "self";
   if(DesktopClass(c)||DesktopClass(root))return "desktop";
   if(!ShellClass(c)&&c!="")return "other";
  }
  // Closing/minimizing often leaves the taskbar, a minimized HWND, or no
  // foreground HWND. Desktop visibility cannot be inferred from its class alone.
  bool appVisible=false;
  EnumWindows(delegate(IntPtr w,IntPtr p){if(VisibleApp(w,own)){appVisible=true;return false;}return true;},IntPtr.Zero);
  return appVisible?"other":"desktop";
 }
 static int Main(string[] args){
  // Mouse hooks report physical pixels; hit-testing must use the same space,
  // especially on scaled displays (for example the user's 150% desktop).
  SetProcessDpiAwarenessContext(new IntPtr(-4));
  uint own=uint.Parse(args[0]);
  if(args.Length>1&&args[1]=="--inspect"){
   if(args.Length>2){IntPtr target=new IntPtr(long.Parse(args[2]));Rect r;GetWindowRect(target,out r);Console.WriteLine("widget parent="+ClassOf(GetParent(target))+" visible="+IsWindowVisible(target)+" minimized="+IsIconic(target)+" child="+((GetWindowLong(target,-16)&0x40000000)!=0)+" bounds="+r.Left+","+r.Top+","+r.Right+","+r.Bottom);}
   IntPtr fg=GetForegroundWindow();Console.WriteLine("foreground="+fg+" class="+ClassOf(fg)+" root="+ClassOf(GetAncestor(fg,2))+" state="+ReadState(own));
   EnumWindows(delegate(IntPtr w,IntPtr p){uint id;GetWindowThreadProcessId(w,out id);if(IsWindowVisible(w)||id==own)Console.WriteLine("hwnd="+w+" pid="+id+" class="+ClassOf(w)+" visible="+IsWindowVisible(w)+" minimized="+IsIconic(w)+" cloaked="+Cloaked(w)+" app="+VisibleApp(w,own));return true;},IntPtr.Zero);return 0;
  }
  IntPtr widget=args.Length>1&&args[1]!="--once"?new IntPtr(long.Parse(args[1])):IntPtr.Zero;
  widgetHandle=widget;
  if(widget!=IntPtr.Zero){
   var writer=new Thread(delegate(){foreach(string line in wheelMessages.GetConsumingEnumerable()){Console.WriteLine(line);Console.Out.Flush();}});writer.IsBackground=true;writer.Start();
   var inputThread=new Thread(delegate(){wheelHook=SetWindowsHookEx(14,wheelProc,GetModuleHandle(null),0);if(wheelHook==IntPtr.Zero){Console.Error.WriteLine("Mouse hook failed: "+Marshal.GetLastWin32Error());return;}System.Windows.Forms.Application.Run();});inputThread.IsBackground=true;inputThread.Start();
  }
  try{while(true){
   try{if(Process.GetProcessById((int)own).HasExited)return 0;}catch{return 0;}
   string mode=ReadState(own);
   // Use desktop ownership, not WS_CHILD / SetParent into Explorer. Chromium
   // needs its own root HWND for Windows precision-touchpad gesture delivery.
   if(widget!=IntPtr.Zero){
    IntPtr host=IntPtr.Zero;
    EnumWindows(delegate(IntPtr w,IntPtr p){if(FindWindowEx(w,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero){host=w;return false;}return true;},IntPtr.Zero);
    if(host==IntPtr.Zero)host=GetShellWindow();
    if(host!=IntPtr.Zero){
     if(GetWindow(widget,4)!=host)SetWindowLongPtr(widget,-8,host);
     if(IsIconic(widget)||!IsWindowVisible(widget))ShowWindowAsync(widget,4);
     // A desktop-owned tool window keeps its own Chromium input root.
     // Place it immediately above the desktop and below ordinary app windows.
     IntPtr above=GetWindow(host,3);
     if(above==widget)above=GetWindow(widget,3);
     SetWindowPos(widget,above,0,0,0,0,0x0010|0x0001|0x0002|0x0040|0x0200);
     mode="attached";
    }
   }
   ReportBusy();
   Console.WriteLine(mode);Console.Out.Flush();
   if(args.Length>1&&args[1]=="--once")return 0;
   Thread.Sleep(150);
  }}catch{return 1;}
 }
}
