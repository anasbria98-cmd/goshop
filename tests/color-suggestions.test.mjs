import test from 'node:test';
import assert from 'node:assert/strict';
import { colorChoices, colorFromFilename, suggestVariantSku, dominantProductColor, nearestColor } from '../lib/color-suggestions.ts';

test('Saved shades override presets without duplicate accented/case names; custom colors stay available', () => {
  const colors=colorChoices([{name:'NOIR',hex:'#202020'},{name:'Cuivré',hex:'#a65f35'}],[{name:'cuivré',hex:'#b16b40'}]);
  assert.equal(colors.filter(c=>c.name.toLowerCase()==='noir').length,1);
  assert.equal(colors.find(c=>c.name==='NOIR').hex,'#202020');
  assert.equal(colors.filter(c=>c.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='cuivre').length,1);
  assert.equal(colors.find(c=>c.name==='cuivré').hex,'#b16b40');
});

test('Filename suggestions recognize whole color names, custom catalogue names and aliases, and reject ambiguity', () => {
  const colors=colorChoices([{name:'Cuivré',hex:'#a65f35'}]);
  assert.equal(colorFromFilename('20254-Triple-Galaxy-Blanc-Monobloc.png',colors).name,'Blanc');
  assert.equal(colorFromFilename('GALAXY_gris-clair_20254.webp',colors).name,'Gris clair');
  assert.equal(colorFromFilename('switch_black.jpg',colors).name,'Noir');
  assert.equal(colorFromFilename('prise_cuivré.png',colors).name,'Cuivré');
  assert.equal(colorFromFilename('interrupteur_أسود.png',colors).name,'Noir');
  assert.equal(colorFromFilename('noir-blanc.png',colors),null);
  assert.equal(colorFromFilename('10210NR.png',colors),null,'Technical references must not be guessed as color words');
  assert.equal(colorFromFilename('blanchisserie.png',colors),null);
});

test('Suggested internal references stay unique, preserve the base reference and respect length/custom-name limits', () => {
  assert.equal(suggestVariantSku('GS200','Blanc','Mat',[]),'GS200-BLANC-MAT');
  assert.equal(suggestVariantSku('GS200','Blanc','Mat',['gs200-blanc-mat','GS200-BLANC-MAT-2']),'GS200-BLANC-MAT-3');
  assert.equal(suggestVariantSku('','Blanc','',[]),'');
  assert.equal(suggestVariantSku('REF','أسود','',[]),'REF-COULEUR');
  assert.ok(suggestVariantSku('A'.repeat(80),'Couleur personnalisée très longue','Satiné',[]).length<=80);
});

function image(width,height,background,foreground) {
  const pixels=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    pixels.set(x>=3&&x<width-3&&y>=3&&y<height-3?foreground:background,(y*width+x)*4);
  }
  return pixels;
}

test('Photo estimation excludes white/transparent backgrounds and refuses uniform or unusable samples', () => {
  assert.equal(dominantProductColor(image(20,20,[255,255,255,255],[40,60,80,255]),20,20),'#283c50');
  assert.equal(dominantProductColor(image(20,20,[0,0,0,0],[150,150,150,255]),20,20),'#969696');
  assert.equal(dominantProductColor(image(20,20,[255,255,255,255],[255,255,255,255]),20,20),null);
  assert.equal(dominantProductColor(new Uint8ClampedArray(10),20,20),null);
  const tiny=new Uint8ClampedArray(20*20*4).fill(255);
  tiny.set([0,0,0,255],(10*20+10)*4);
  assert.equal(dominantProductColor(tiny,20,20),null,'A tiny dark symbol must not identify an otherwise white photo as black');
  assert.equal(nearestColor('#161616',colorChoices([])).name,'Noir');
  assert.equal(nearestColor('#01ff04',colorChoices([])).name,'Couleur personnalisée');
});
