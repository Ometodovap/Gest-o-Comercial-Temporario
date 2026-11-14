const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../src/styles.css'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../src/App.tsx'),'utf8');
const responsive=css.slice(css.indexOf('/* v0.9 — sidebar responsiva'));
test('menu desktop mantém altura da janela sem perder o rodapé',()=>{
 assert.match(responsive,/\.sidebar\{height:100vh;height:100dvh;overflow:hidden\}/);
 assert.match(responsive,/\.sidebar-bottom\{flex-shrink:0;margin-top:0\}/);
 assert.match(responsive,/\.sidebar \.brand,\.sidebar \.sidebar-name\{flex-shrink:0\}/);
});
test('navegação principal rola independentemente do conteúdo',()=>{
 assert.match(responsive,/\.sidebar nav\{[\s\S]*?flex:1 1 auto;[\s\S]*?min-height:0;[\s\S]*?overflow-y:auto;/);
 assert.match(responsive,/\.sidebar nav button\{width:100%;min-height:46px\}/);
});
test('mobile apresenta navegação horizontal com rolagem sem cortar botões',()=>{
 assert.match(responsive,/@media\(max-width:800px\)\{[\s\S]*?\.sidebar\{height:auto;overflow:visible\}/);
 assert.match(responsive,/display:flex;[\s\S]*?flex-wrap:nowrap;[\s\S]*?overflow-x:auto;/);
 assert.match(responsive,/\.sidebar nav button\{width:auto;min-width:max-content;flex-shrink:0\}/);
});
test('opção ativa e saída permanecem identificadas e acessíveis',()=>{
 assert.match(app,/<nav aria-label="Navegação principal">/);
 assert.match(app,/aria-current=\{tab===x\.id\?'page':undefined\}/);
 assert.match(app,/className="sidebar-bottom"/);
 assert.match(app,/>Sair da conta<\/button>/);
 assert.match(responsive,/focus-visible/);
});
