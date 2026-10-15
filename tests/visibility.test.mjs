import {test} from 'node:test';
import assert from 'node:assert/strict';
import visibility from '../electron/visibility.cjs';
function windowStub(){let visible=true,minimized=false;const calls=[];return {calls,isDestroyed:()=>false,isVisible:()=>visible,isMinimized:()=>minimized,hide(){calls.push('hide');visible=false;},restore(){calls.push('restore');minimized=false;visible=true;},showInactive(){calls.push('showInactive');visible=true;},minimize(){minimized=true;visible=false;}};}
test('opening and closing another app restores both compact and expanded modes repeatedly',()=>{
 for(const compact of [true,false]){const win=windowStub();win.compact=compact;for(let i=0;i<3;i++){visibility.applyVisibility(win,'other');assert.equal(win.isVisible(),false);visibility.applyVisibility(win,'desktop');assert.equal(win.isVisible(),true);assert.equal(win.compact,compact);}assert.deepEqual(win.calls,['hide','showInactive','hide','showInactive','hide','showInactive']);}
});
test('Show Desktop restores an OS-minimized window before showing it',()=>{const win=windowStub();win.minimize();visibility.applyVisibility(win,'desktop');assert.equal(win.isMinimized(),false);assert.equal(win.isVisible(),true);assert.deepEqual(win.calls,['restore']);});
test('steady desktop polling does not repeatedly raise or focus Taskit',()=>{const win=windowStub();visibility.applyVisibility(win,'desktop');visibility.applyVisibility(win,'self');assert.deepEqual(win.calls,[]);});
