import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonHoverStyle } from '../src/uiConfig.ts';

test('bitmap hover keeps text readable against the unchanged image surface', () => {
  const style = {background:'#29333b', textColor:'#f2ede3', hoverBackground:'#c58b4e',
    hoverTextColor:'#15191d', skin:{desktop:'button.png'}, renderMode:'image'};
  assert.deepEqual(buttonHoverStyle(undefined, style), {color:'#f2ede3'});
  assert.deepEqual(buttonHoverStyle({hoverTextColor:'#ffffff'}, style), {color:'#ffffff'});
  assert.equal(buttonHoverStyle({renderMode:'html'}, style).color, '#15191d');
  assert.equal(buttonHoverStyle({renderMode:'html'}, style).backgroundColor, '#c58b4e');
  assert.deepEqual(buttonHoverStyle(undefined, {...style, renderMode:undefined}), {color:'#f2ede3'});
  assert.deepEqual(buttonHoverStyle(undefined, {...style, skin:undefined, backgroundImage:'old.png'}), {color:'#f2ede3'});
  assert.deepEqual(buttonHoverStyle(undefined, {...style, background:'#ffffff', textColor:'#15191d', hoverTextColor:'#f2ede3'}), {color:'#15191d'});
});
