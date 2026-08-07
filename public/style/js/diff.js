/* ============ Icons ============ */
var ICONS={
 "git-compare":'<svg viewBox="0 0 24 24"><path d="M16 3h5v5"/><path d="M4 21h16"/><path d="M21 3l-7.5 7.5"/><path d="M3 16l5-5"/></svg>',
 "sun":'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>',
 "moon":'<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
 "swap":'<svg viewBox="0 0 24 24"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>',
 "trash":'<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
 "download":'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
 "help":'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
 "sparkles":'<svg viewBox="0 0 24 24"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></svg>',
 "file-code":'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 13-2 2 2 2"/><path d="m13 13 2 2-2 2"/></svg>',
 "plus":'<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
 "minus":'<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
 "check":'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
 "percent":'<svg viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
 "chev-up":'<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>',
 "chev-down":'<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
 "search":'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.7" y2="16.7"/></svg>',
 "x":'<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
 "columns":'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',
 "rows":'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
 "align":'<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>',
 "case":'<svg viewBox="0 0 24 24"><path d="M3 5h6v14"/><path d="M3 5l4 7"/><path d="M12 19l4-9 4 9"/><path d="M13.5 16h5"/></svg>',
 "hash":'<svg viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
 "wrap":'<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="11" y2="18"/><polyline points="15 15 18 18 21 15"/></svg>',
 "eye":'<svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
 "code2":'<svg viewBox="0 0 24 24"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>',
 "updown":'<svg viewBox="0 0 24 24"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>',
 "filter":'<svg viewBox="0 0 24 24"><path d="M3 6h12"/><path d="M3 12h9"/><path d="M3 18h6"/><path d="M17 15l4 4"/><path d="M21 15l-4 4"/></svg>',
 "upload":'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
 "copy":'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
 "keyboard":'<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>',
 "shield":'<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
 "heart":'<svg viewBox="0 0 24 24"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>',
 "zap":'<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
 "lock":'<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
 "check2":'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
 "file-text":'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
 "laptop":'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>'
};
document.querySelectorAll('[data-icon]').forEach(function(el){el.innerHTML=ICONS[el.getAttribute('data-icon')]||'';});

/* ============ Sample presets ============ */
var PRESETS=[
 {id:'text-compare-overview',name:'Text Compare Product Feature Overview',category:'text',
  left:"TEXT COMPARE ONLINE DIFF TOOL - OVERVIEW\n\nText Compare is a fast, accurate online text comparison utility designed for developers, writers, editors, and legal professionals.\n\nKey Features:\n- Instant Side-by-Side and Unified Inline Diff View\n- Character-level, Word-level, and Line-level Difference Detection\n- Zero Server Uploads: 100% Client-Side Private Text Comparison\n- Line Number Synchronization & Smooth Scrolling\n- Built-in JSON Formatter, Line Sorting, and Line Cleanup\n\nWhy Use Online Text Compare?\nComparing documents manually line by line is slow and prone to human error. Our Text Compare engine highlights added, modified, and deleted text in real-time with visual color cues.",
  right:"TEXT COMPARE PRO ONLINE DIFF TOOL - OVERVIEW & SPECS\n\nText Compare PRO is a high-performance online text comparison utility designed for developers, copywriters, editors, and legal teams worldwide.\n\nKey Features:\n- Instant Side-by-Side Split and Unified Inline Diff Display\n- Character-level, Word-level, and Line-level Difference Detection Engine\n- 100% Client-Side Privacy: No Server Data Transfers or Storage\n- Line Number Alignment, Synchronized Smooth Scrolling & Direct Jump Anchors\n- Built-in JSON Formatter, Alphabetical Line Sorting, and Blank Line Removal\n- One-click Unified Git Patch (.diff) Export & HTML Difference Report Download\n\nWhy Choose Online Text Compare PRO?\nComparing text documents manually line by line is exhausting and error-prone. Our advanced Text Compare engine highlights additions, modifications, and deletions instantly with high-contrast color indicators."},
 {id:'text-diff-release-notes',name:'Text Compare Release Notes (Markdown)',category:'markdown',
  left:"# Text Compare Utility v1.0\n\nWelcome to the initial release of our free Text Compare tool!\n\n## Core Features\n* Compare plain text documents online.\n* Split view for side-by-side text inspection.\n* Basic statistics: additions and deletions count.\n\n## Usage Guide\nPaste original text on the left panel, modified text on the right panel. Click compare to view differences.",
  right:"# Text Compare Utility v2.0 (Pro Release)\n\nWelcome to the major upgrade of our free, browser-based Text Compare tool!\n\n## Core Features\n* Ultra-fast online text compare engine with zero server latency.\n* Dual view modes: Side-by-Side Split View and Single Column Unified View.\n* Granular comparison modes: Character, Word, and Line level matching.\n* Real-time Similarity Score percentage calculation.\n* Quick action toolbars: JSON Prettifier, Case Ignore, Trim Whitespace, and Line Sorting.\n\n## Usage & Privacy Guide\nPaste original text on the left, modified text on the right. Your text never leaves your browser!"},
 {id:'text-compare-json-config',name:'Text Compare Diff Settings (JSON)',category:'json',
  left:'{\n  "appName": "Text Compare Utility",\n  "version": "1.0.0",\n  "settings": {\n    "viewMode": "split",\n    "granularity": "word",\n    "ignoreWhitespace": false,\n    "ignoreCase": false,\n    "showLineNumbers": true\n  },\n  "supportedFormats": ["txt", "md", "json", "code"]\n}',
  right:'{\n  "appName": "Text Compare Utility PRO",\n  "version": "2.0.0",\n  "settings": {\n    "viewMode": "split",\n    "granularity": "word",\n    "ignoreWhitespace": true,\n    "ignoreCase": true,\n    "ignoreLineEndings": true,\n    "showLineNumbers": true,\n    "syncScroll": true,\n    "onlyShowDifferences": false\n  },\n  "supportedFormats": ["txt", "md", "json", "js", "ts", "html", "diff"],\n  "seoOptimized": true\n}'},
 {id:'text-compare-algorithm-code',name:'Text Diff Algorithm (TypeScript)',category:'code',
  left:"function compareStrings(originalText: string, modifiedText: string): boolean {\n  if (originalText === modifiedText) {\n    return true;\n  }\n  return false;\n}",
  right:"export interface DiffResult {\n  isMatch: boolean;\n  similarityPercentage: number;\n  addedLinesCount: number;\n  removedLinesCount: number;\n}\n\nexport function compareStrings(originalText: string, modifiedText: string): DiffResult {\n  const isMatch = originalText === modifiedText;\n  const maxLen = Math.max(originalText.length, modifiedText.length);\n  \n  if (isMatch || maxLen === 0) {\n    return { isMatch: true, similarityPercentage: 100, addedLinesCount: 0, removedLinesCount: 0 };\n  }\n\n  return {\n    isMatch: false,\n    similarityPercentage: Math.round((originalText.length / maxLen) * 100),\n    addedLinesCount: 5,\n    removedLinesCount: 2\n  };\n}"}
];

/* ============ Diff engine (LCS based) ============ */
function lcsOps(oldArr,newArr,eq){
  var N=oldArr.length,M=newArr.length;
  var dp=[]; for(var i=0;i<=N;i++){dp.push(new Int32Array(M+1));}
  for(var i=N-1;i>=0;i--){
    for(var j=M-1;j>=0;j--){
      if(eq(oldArr[i],newArr[j])) dp[i][j]=dp[i+1][j+1]+1;
      else dp[i][j]=Math.max(dp[i+1][j],dp[i][j+1]);
    }
  }
  var ops=[],i=0,j=0;
  while(i<N&&j<M){
    if(eq(oldArr[i],newArr[j])){ops.push({t:'eq',oi:i,nj:j});i++;j++;}
    else if(dp[i+1][j]>=dp[i][j+1]){ops.push({t:'del',oi:i});i++;}
    else{ops.push({t:'add',nj:j});j++;}
  }
  while(i<N){ops.push({t:'del',oi:i});i++;}
  while(j<M){ops.push({t:'add',nj:j});j++;}
  return ops;
}
function tokenDiff(oldStr,newStr,ignoreCase,tokenize){
  var o=tokenize(oldStr),n=tokenize(newStr);
  var eq=ignoreCase?function(a,b){return a.toLowerCase()===b.toLowerCase();}:function(a,b){return a===b;};
  var ops=lcsOps(o,n,eq),changes=[],buf='',state=null;
  function flush(){if(buf!==''||state!==null){changes.push({value:buf,added:state==='add',removed:state==='rem'});buf='';state=null;}}
  for(var k=0;k<ops.length;k++){
    var op=ops[k];
    if(op.t==='eq'){if(state!==null&&state!=='eq')flush();buf+=o[op.oi];state='eq';}
    else if(op.t==='del'){if(state!==null&&state!=='rem')flush();buf+=o[op.oi];state='rem';}
    else{if(state!==null&&state!=='add')flush();buf+=n[op.nj];state='add';}
  }
  flush();
  return changes;
}
function wordTok(s){return s.split(/(\s+)/);}
function charTok(s){return Array.from(s);}
function lineTok(s){return s.split('\n');}

function normalizeText(text,opts){
  var n=text;
  if(opts.ignoreLineEndings) n=n.replace(/\r\n/g,'\n');
  if(opts.trimLines) n=n.split('\n').map(function(l){return l.replace(/\s+$/,'');}).join('\n');
  return n;
}
function computeIntraline(left,right,gran,ignoreCase){
  if(gran==='line') return {leftChunks:[{value:left,removed:true}],rightChunks:[{value:right,added:true}]};
  var tok=gran==='char'?charTok:wordTok;
  var ch=tokenDiff(left,right,ignoreCase,tok);
  var lc=[],rc=[];
  for(var i=0;i<ch.length;i++){
    var c=ch[i];
    if(c.added) rc.push({value:c.value,added:true});
    else if(c.removed) lc.push({value:c.value,removed:true});
    else{lc.push({value:c.value});rc.push({value:c.value});}
  }
  return {leftChunks:lc,rightChunks:rc};
}
function computeSplitDiff(leftRaw,rightRaw,opts,gran){
  var left=normalizeText(leftRaw,opts),right=normalizeText(rightRaw,opts);
  var eq=opts.ignoreWhitespace?function(a,b){return a.replace(/\s+/g,' ').trim()===b.replace(/\s+/g,' ').trim();}:function(a,b){return a===b;};
  var lLines=lineTok(left),rLines=lineTok(right);
  var ops=lcsOps(lLines,rLines,eq);
  var lines=[],li=1,ri=1,diffIdx=0,additions=0,deletions=0,unchanged=0,k=0;
  while(k<ops.length){
    var op=ops[k];
    if(op.t==='eq'){lines.push({leftLineNum:li++,rightLineNum:ri++,leftText:lLines[op.oi],rightText:rLines[op.nj],type:'unchanged'});unchanged++;k++;}
    else{
      var rem=[],add=[];
      while(k<ops.length&&ops[k].t==='del'){rem.push(lLines[ops[k].oi]);k++;}
      while(k<ops.length&&ops[k].t==='add'){add.push(rLines[ops[k].nj]);k++;}
      var di=++diffIdx,pair=Math.min(rem.length,add.length);
      for(var p=0;p<pair;p++){
        var lt=rem[p],rt=add[p];
        var intra=computeIntraline(lt,rt,gran,opts.ignoreCase);
        lines.push({leftLineNum:li++,rightLineNum:ri++,leftText:lt,rightText:rt,type:'modified',leftChunks:intra.leftChunks,rightChunks:intra.rightChunks,diffIndex:di});
        deletions++;additions++;
      }
      for(var r=pair;r<rem.length;r++){lines.push({leftLineNum:li++,rightLineNum:undefined,leftText:rem[r],rightText:'',type:'removed',leftChunks:[{value:rem[r],removed:true}],diffIndex:di});deletions++;}
      for(var a=pair;a<add.length;a++){lines.push({leftLineNum:undefined,rightLineNum:ri++,leftText:'',rightText:add[a],type:'added',rightChunks:[{value:add[a],added:true}],diffIndex:di});additions++;}
    }
  }
  var stats={additions:additions,deletions:deletions,unchanged:unchanged,totalLines:lines.length,similarity:similarity(left,right),diffCount:diffIdx};
  return {lines:lines,stats:stats};
}
function similarity(left,right){
  if(left.length===0&&right.length===0)return 100;
  if(left.length===0||right.length===0)return 0;
  var maxLen=Math.max(left.length,right.length);
  if(maxLen>4000){
    var ops=lcsOps(lineTok(left),lineTok(right),function(a,b){return a===b;});
    var ll=lineTok(left),rl=lineTok(right),matched=0;
    for(var i=0;i<ops.length;i++){if(ops[i].t==='eq')matched+=ll[ops[i].oi].length;}
    return Math.round(matched/maxLen*100);
  }
  var ch=tokenDiff(left,right,false,charTok),m=0;
  for(var i=0;i<ch.length;i++){if(!ch[i].added&&!ch[i].removed)m+=ch[i].value.length;}
  return Math.round(m/maxLen*100);
}
function generatePatchString(leftText,rightText){
  var lLines=lineTok(leftText),rLines=lineTok(rightText);
  var ops=lcsOps(lLines,rLines,function(a,b){return a===b;});
  var li=0,ri=0,seq=[];
  for(var i=0;i<ops.length;i++){
    var op=ops[i];
    if(op.t==='eq'){seq.push({t:' ',l:lLines[li],ln:li+1,rn:ri+1});li++;ri++;}
    else if(op.t==='del'){seq.push({t:'-',l:lLines[li],ln:li+1});li++;}
    else{seq.push({t:'+',r:rLines[ri],rn:ri+1});ri++;}
  }
  var ctx=3,hunks=[],i=0;
  while(i<seq.length){
    if(seq[i].t===' '){i++;continue;}
    var start=Math.max(0,i-ctx),end=i;
    while(end<seq.length&&(seq[end].t!==' '||(end<seq.length-1&&seq[end+1].t!==' ')))end++;
    end=Math.min(seq.length-1,end+ctx);
    var hl=seq.slice(start,end+1),ls=null,rs=null,lc=0,rc=0;
    for(var h=0;h<hl.length;h++){
      var s=hl[h];
      if(s.t===' '){if(ls===null)ls=s.ln;if(rs===null)rs=s.rn;lc++;rc++;}
      else if(s.t==='-'){if(ls===null)ls=s.ln;lc++;}
      else{if(rs===null)rs=s.rn;rc++;}
    }
    var body='@@ -'+ls+', '+lc+' +'+rs+', '+rc+' @@\n';
    for(var h=0;h<hl.length;h++){
      var s=hl[h];
      if(s.t===' ')body+=' '+s.l+'\n';
      else if(s.t==='-')body+='-'+s.l+'\n';
      else body+='+'+s.r+'\n';
    }
    hunks.push(body);
    i=end+1;
  }
  return '--- original.txt\n+++ modified.txt\n'+hunks.join('');
}

/* ============ State ============ */
var state={
  theme:(function(){try{var s=localStorage.getItem('text_compare_theme');if(s==='dark'||s==='light')return s;return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}catch(e){return 'light';}})(),
  leftText:PRESETS[0].left,
  rightText:PRESETS[0].right,
  viewMode:'split',
  granularity:'word',
  isEditing:false,
  mobileTab:'left',
  options:{ignoreWhitespace:false,ignoreCase:false,ignoreLineEndings:true,trimLines:false,showLineNumbers:true,syncScroll:true,wrapLines:false,onlyShowDifferences:false},
  currentDiffIndex:1,
  searchQuery:'',
  isExportOpen:false,
  isHelpOpen:false,
  copiedSide:null
};
var splitData=[],unifiedData=[],stats={additions:0,deletions:0,unchanged:0,totalLines:0,similarity:100,diffCount:0};

/* ============ Helpers ============ */
function $(id){return document.getElementById(id);}
function esc(s){return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function renderTextWithSearch(text){
  if(!state.searchQuery||!state.searchQuery.trim())return esc(text);
  var q=state.searchQuery,re=new RegExp('('+escRe(q)+')','gi'),parts=String(text).split(re),out='';
  for(var i=0;i<parts.length;i++){
    if(parts[i].toLowerCase()===q.toLowerCase())out+='<mark>'+esc(parts[i])+'</mark>';
    else out+=esc(parts[i]);
  }
  return out;
}
function renderChunks(chunks,defaultText){
  if(!chunks||chunks.length===0)return renderTextWithSearch(defaultText);
  var out='';
  for(var i=0;i<chunks.length;i++){
    var c=chunks[i];
    if(c.added)out+='<span class="chunk-add">'+renderTextWithSearch(c.value)+'</span>';
    else if(c.removed)out+='<span class="chunk-del">'+renderTextWithSearch(c.value)+'</span>';
    else out+=renderTextWithSearch(c.value);
  }
  return out;
}

/* ============ Recompute ============ */
function recompute(){
  var r=computeSplitDiff(state.leftText,state.rightText,state.options,state.granularity);
  splitData=r.lines;stats=r.stats;
  // build unified from split
  unifiedData=[];
  for(var i=0;i<splitData.length;i++){
    var l=splitData[i];
    if(l.type==='unchanged')unifiedData.push({leftLineNum:l.leftLineNum,rightLineNum:l.rightLineNum,text:l.leftText,type:'unchanged'});
    else if(l.type==='modified'){
      unifiedData.push({leftLineNum:l.leftLineNum,rightLineNum:undefined,text:l.leftText,type:'removed',chunks:l.leftChunks,diffIndex:l.diffIndex});
      unifiedData.push({leftLineNum:undefined,rightLineNum:l.rightLineNum,text:l.rightText,type:'added',chunks:l.rightChunks,diffIndex:l.diffIndex});
    }else if(l.type==='removed')unifiedData.push({leftLineNum:l.leftLineNum,rightLineNum:undefined,text:l.leftText,type:'removed',chunks:l.leftChunks,diffIndex:l.diffIndex});
    else if(l.type==='added')unifiedData.push({leftLineNum:undefined,rightLineNum:l.rightLineNum,text:l.rightText,type:'added',chunks:l.rightChunks,diffIndex:l.diffIndex});
  }
  // adjust currentDiffIndex
  if(stats.diffCount===0)state.currentDiffIndex=0;
  else if(state.currentDiffIndex>stats.diffCount||state.currentDiffIndex===0)state.currentDiffIndex=1;
  renderStats();
  renderDiff();
  renderEditStats();
}

function renderStats(){
  $('statMatch').textContent=stats.similarity+'% Match';
  $('statAdd').textContent=stats.additions+' added';
  $('statDel').textContent=stats.deletions+' removed';
  $('statUnch').textContent=stats.unchanged+' unchanged';
  var lbl=$('stepperLbl');
  if(stats.diffCount>0)lbl.innerHTML='Diff <strong>'+state.currentDiffIndex+'</strong> of <strong>'+stats.diffCount+'</strong>';
  else lbl.textContent='No diffs';
  $('prevDiff').disabled=stats.diffCount===0;
  $('nextDiff').disabled=stats.diffCount===0;
}

function renderEditStats(){
  var lc=state.leftText?state.leftText.split('\n').length:0;
  var rc=state.rightText?state.rightText.split('\n').length:0;
  $('leftStat').textContent=lc+' lines • '+(state.leftText?state.leftText.length:0)+' chars';
  $('rightStat').textContent=rc+' lines • '+(state.rightText?state.rightText.length:0)+' chars';
  $('leftLines').textContent=splitData.filter(function(l){return l.leftLineNum!==undefined;}).length+' lines';
  $('rightLines').textContent=splitData.filter(function(l){return l.rightLineNum!==undefined;}).length+' lines';
}

/* ============ Diff rendering ============ */
function filteredSplit(){return state.options.onlyShowDifferences?splitData.filter(function(l){return l.type!=='unchanged';}):splitData;}
function filteredUni(){return state.options.onlyShowDifferences?unifiedData.filter(function(l){return l.type!=='unchanged';}):unifiedData;}

function rowBgClass(type,isActive){
  var c='';
  if(type==='removed')c='removed';
  else if(type==='modified')c='modified';
  else if(type==='added')c='added';
  if(isActive&&type!=='unchanged')c+=' active';
  return c;
}
function wrapCls(){return state.options.wrapLines?' wrap':'';}

function renderDiff(){
  if(state.isEditing){return;}
  if(state.viewMode==='split')renderSplit();else renderUnified();
}
function renderSplit(){
  var data=filteredSplit(),left='',right='',opt=state.options,cur=state.currentDiffIndex;
  for(var i=0;i<data.length;i++){
    var l=data[i],isA=l.diffIndex===cur;
    var cls=rowBgClass(l.type,isA)+(opt.wrapLines?' wrap':'');
    if(l.type==='added'){
      left+='<div class="row '+cls+'">'+(opt.showLineNumbers?'<span class="ln">'+(l.leftLineNum!=null?l.leftLineNum:'')+'</span>':'')+'<span class="sym"> </span><div class="content"><span class="placeholder">• • •</span></div></div>';
    }else{
      left+='<div class="row '+cls+'">'+(opt.showLineNumbers?'<span class="ln">'+(l.leftLineNum!=null?l.leftLineNum:'')+'</span>':'')+'<span class="sym">'+(l.type==='removed'||l.type==='modified'?'-':' ')+'</span><div class="content">'+renderChunks(l.leftChunks,l.leftText)+'</div></div>';
    }
    if(l.type==='removed'){
      right+='<div class="row '+cls+'">'+(opt.showLineNumbers?'<span class="ln">'+(l.rightLineNum!=null?l.rightLineNum:'')+'</span>':'')+'<span class="sym"> </span><div class="content"><span class="placeholder">• • •</span></div></div>';
    }else{
      right+='<div class="row '+cls+'">'+(opt.showLineNumbers?'<span class="ln">'+(l.rightLineNum!=null?l.rightLineNum:'')+'</span>':'')+'<span class="sym">'+(l.type==='added'||l.type==='modified'?'+':' ')+'</span><div class="content">'+renderChunks(l.rightChunks,l.rightText)+'</div></div>';
    }
  }
  $('leftScroll').innerHTML=left;
  $('rightScroll').innerHTML=right;
  var act=document.querySelector('#leftScroll .row.active')||document.querySelector('#rightScroll .row.active');
  if(act)act.scrollIntoView({behavior:'smooth',block:'center'});
}
function renderUnified(){
  var data=filteredUni(),opt=state.options,cur=state.currentDiffIndex,html='';
  for(var i=0;i<data.length;i++){
    var l=data[i],isA=l.diffIndex===cur;
    var cls=rowBgClass(l.type,isA)+(opt.wrapLines?' wrap':'');
    var sym=' ',sc='sym';
    if(l.type==='added'){sym='+';sc='sym a';}
    else if(l.type==='removed'){sym='-';sc='sym d';}
    html+='<div class="row '+cls+'">'+
      (opt.showLineNumbers?'<span class="ln2">'+(l.leftLineNum!=null?l.leftLineNum:'')+'</span><span class="ln2">'+(l.rightLineNum!=null?l.rightLineNum:'')+'</span>':'')+
      '<span class="'+sc+'">'+sym+'</span><div class="content">'+renderChunks(l.chunks,l.text)+'</div></div>';
  }
  $('unifiedInner').innerHTML=html;
  var act=document.querySelector('#unifiedInner .row.active');
  if(act)act.scrollIntoView({behavior:'smooth',block:'center'});
}

/* ============ Sync scroll ============ */
var syncing=false;
function syncScroll(src){
  if(!state.options.syncScroll||syncing)return;
  syncing=true;
  var a=$(src==='left'?'leftScroll':'rightScroll'),b=$(src==='left'?'rightScroll':'leftScroll');
  b.scrollTop=a.scrollTop;b.scrollLeft=a.scrollLeft;
  requestAnimationFrame(function(){syncing=false;});
}

/* ============ View toggles ============ */
function applyTheme(){
  if(state.theme==='dark')document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  var tb=$('themeBtn');if(tb){tb.querySelector('span').textContent=state.theme==='dark'?'Light':'Dark';tb.querySelector('.ic').innerHTML=ICONS[state.theme==='dark'?'sun':'moon'];}
  var mb=$('mThemeBtn');if(mb)mb.querySelector('.ic').innerHTML=ICONS[state.theme==='dark'?'sun':'moon'];
}
function toggleTheme(){state.theme=state.theme==='dark'?'light':'dark';try{localStorage.setItem('text_compare_theme',state.theme);}catch(e){}applyTheme();}
function setEdit(on){
  state.isEditing=on;
  $('editGrid').style.display=on?'flex':'none';
  $('splitView').style.display=(!on&&state.viewMode==='split')?'grid':'none';
  $('unifiedView').style.display=(!on&&state.viewMode==='unified')?'block':'none';
  $('editBtn').classList.toggle('active',on);
  $('diffBtn').classList.toggle('active',!on);
  $('mEditBtn').classList.toggle('active',on);
  $('mDiffBtn').classList.toggle('active',!on);
  if(on){$('leftInput').value=state.leftText;$('rightInput').value=state.rightText;renderEditStats();}
  else recompute();
}
function setViewMode(m){
  state.viewMode=m;
  $('splitBtn').classList.toggle('active',m==='split');
  $('unifiedBtn').classList.toggle('active',m==='unified');
  setEdit(state.isEditing); // refresh display
}
function setGran(g){
  state.granularity=g;
  $('gLine').classList.toggle('active',g==='line');
  $('gWord').classList.toggle('active',g==='word');
  $('gChar').classList.toggle('active',g==='char');
  recompute();
}
function toggleOpt(key,btnId){
  state.options[key]=!state.options[key];
  var btn=$(btnId);
  btn.classList.toggle('on',state.options[key]);
  if(key==='onlyShowDifferences')btn.classList.toggle('on-amber',state.options[key]);
  if(key==='ignoreCase')btn.classList.toggle('on',state.options[key]);
  recompute();
}
function nextDiff(){if(stats.diffCount===0)return;state.currentDiffIndex=state.currentDiffIndex<stats.diffCount?state.currentDiffIndex+1:1;renderStats();renderDiff();}
function prevDiff(){if(stats.diffCount===0)return;state.currentDiffIndex=state.currentDiffIndex>1?state.currentDiffIndex-1:stats.diffCount;renderStats();renderDiff();}
function swap(){var t=state.leftText;state.leftText=state.rightText;state.rightText=t;if(state.isEditing){$('leftInput').value=state.leftText;$('rightInput').value=state.rightText;}recompute();}
function clear(){state.leftText='';state.rightText='';if(state.isEditing){$('leftInput').value='';$('rightInput').value='';}recompute();}
function loadPreset(id){var p=PRESETS.filter(function(x){return x.id===id;})[0];if(!p)return;state.leftText=p.left;state.rightText=p.right;if(state.isEditing){$('leftInput').value=p.left;$('rightInput').value=p.right;}recompute();}

/* ============ Edit panel actions ============ */
function fmtJson(side){var tgt=side==='left'?state.leftText:state.rightText;try{var o=JSON.parse(tgt);setSide(side,JSON.stringify(o,null,2));}catch(e){alert('Invalid JSON in '+(side==='left'?'left':'right')+' panel');}}
function sortLines(side){var tgt=side==='left'?state.leftText:state.rightText;setSide(side,tgt.split('\n').sort().join('\n'));}
function trimEmpty(side){var tgt=side==='left'?state.leftText:state.rightText;setSide(side,tgt.split('\n').filter(function(l){return l.trim().length>0;}).join('\n'));}
function setSide(side,val){if(side==='left'){state.leftText=val;$('leftInput').value=val;}else{state.rightText=val;$('rightInput').value=val;}recompute();}
function copyPanel(side){
  var txt=side==='left'?state.leftText:state.rightText;
  if(navigator.clipboard)navigator.clipboard.writeText(txt);
  var btn=document.querySelector('[data-copy="'+side+'"]');
  if(btn){btn.classList.add('copied');var sp=btn.querySelector('span');var old=sp.textContent;sp.textContent='Copied';setTimeout(function(){btn.classList.remove('copied');sp.textContent=old;},2000);}
}
function copyAll(){
  var combined='=== ORIGINAL ===\n'+state.leftText+'\n\n=== MODIFIED ===\n'+state.rightText;
  if(navigator.clipboard)navigator.clipboard.writeText(combined);
}

/* ============ Export ============ */
function openExport(){state.isExportOpen=true;$('exportModal').hidden=false;$('patchPreview').textContent=generatePatchString(state.leftText,state.rightText);}
function closeExport(){state.isExportOpen=false;$('exportModal').hidden=true;}
function openHelp(){state.isHelpOpen=true;$('helpModal').hidden=false;}
function closeHelp(){state.isHelpOpen=false;$('helpModal').hidden=true;}
function download(name,content,type){var b=new Blob([content],{type:type});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);}
function dlPatch(){download('changes.patch',generatePatchString(state.leftText,state.rightText),'text/plain;charset=utf-8');}
function dlHtml(){
  var pt=generatePatchString(state.leftText,state.rightText).split('\n');
  var lines=pt.map(function(l){var e=esc(l);if(l.indexOf('+')===0)return '<div class="line add">'+e+'</div>';if(l.indexOf('-')===0)return '<div class="line del">'+e+'</div>';if(l.indexOf('@')===0)return '<div class="line chunk-hdr">'+e+'</div>';return '<div class="line">'+e+'</div>';}).join('\n');
  var isD=state.theme==='dark';
  var bg=isD?'#020617':'#f8fafc',card=isD?'#0f172a':'#ffffff',tc=isD?'#f1f5f9':'#0f172a',bc=isD?'#1e293b':'#e2e8f0',cb=isD?'#040711':'#f1f5f9',ac=isD?'#34d399':'#047857',dc=isD?'#f87171':'#b91c1c';
  var html='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Text Compare Difference Report</title><style>body{font-family:system-ui,sans-serif;background:'+bg+';color:'+tc+';padding:2rem 1rem;margin:0;line-height:1.5}.container{max-width:960px;margin:0 auto}.card{background:'+card+';border-radius:12px;padding:1.5rem;box-shadow:0 4px 20px rgba(0,0,0,.08);border:1px solid '+bc+'}h1{margin-top:0;font-size:1.5rem;color:#6366f1}.stats{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:1.5rem;font-family:monospace;font-size:.85rem;font-weight:600}.badge{padding:.35rem .85rem;border-radius:9999px}.similarity{background:rgba(99,102,241,.15);color:#6366f1}.added{background:rgba(16,185,129,.15);color:#10b981}.removed{background:rgba(244,63,94,.15);color:#f43f5e}.diff-box{background:'+cb+';padding:1rem;border-radius:8px;overflow-x:auto;font-family:monospace;font-size:.85rem;line-height:1.6;border:1px solid '+bc+'}.line{white-space:pre-wrap;word-break:break-all;padding:.1rem .4rem;border-radius:2px}.line.add{background:rgba(16,185,129,.2);color:'+ac+'}.line.del{background:rgba(244,63,94,.2);color:'+dc+'}.line.chunk-hdr{color:#818cf8;font-weight:bold;background:rgba(99,102,241,.1);margin:.4rem 0}</style></head><body><div class="container"><div class="card"><h1>Text Compare Difference Report</h1><div class="stats"><span class="badge similarity">'+stats.similarity+'% Match</span><span class="badge added">+'+stats.additions+' Added</span><span class="badge removed">-'+stats.deletions+' Removed</span></div><div class="diff-box">'+lines+'\n</div></div></div></body></html>';
  download('diff-report.html',html,'text/html;charset=utf-8');
}
function dlApp(){
  var html='<!DOCTYPE html>\n'+document.documentElement.outerHTML;
  download('TextCompare-Offline.html',html,'text/html;charset=utf-8');
}
function cpPatch(){if(navigator.clipboard)navigator.clipboard.writeText(generatePatchString(state.leftText,state.rightText));flash('cpPatchIc');}
function cpJson(){var o={timestamp:new Date().toISOString(),stats:stats,patch:generatePatchString(state.leftText,state.rightText)};if(navigator.clipboard)navigator.clipboard.writeText(JSON.stringify(o,null,2));flash('cpJsonIc');}
function flash(id){var el=$(id);var old=el.innerHTML;el.innerHTML=ICONS.check;setTimeout(function(){el.innerHTML=old;},2000);}

/* ============ Wire up ============ */
function init(){
  $('year').textContent=new Date().getFullYear();
  // preset options
  var sel=$('presetSelect');
  PRESETS.forEach(function(p){var o=document.createElement('option');o.value=p.id;o.textContent=p.name+' ('+p.category.toUpperCase()+')';sel.appendChild(o);});
  sel.addEventListener('change',function(){if(this.value)loadPreset(this.value);});
  // header
  $('themeBtn').addEventListener('click',toggleTheme);
  $('mThemeBtn').addEventListener('click',toggleTheme);
  $('swapBtn').addEventListener('click',swap);
  $('clearBtn').addEventListener('click',clear);
  $('exportBtn').addEventListener('click',openExport);
  $('helpBtn').addEventListener('click',openHelp);
  $('editBtn').addEventListener('click',function(){setEdit(true);});
  $('diffBtn').addEventListener('click',function(){setEdit(false);});
  $('mEditBtn').addEventListener('click',function(){setEdit(true);});
  $('mDiffBtn').addEventListener('click',function(){setEdit(false);});
  // options
  $('splitBtn').addEventListener('click',function(){setViewMode('split');});
  $('unifiedBtn').addEventListener('click',function(){setViewMode('unified');});
  $('gLine').addEventListener('click',function(){setGran('line');});
  $('gWord').addEventListener('click',function(){setGran('word');});
  $('gChar').addEventListener('click',function(){setGran('char');});
  $('optWs').addEventListener('click',function(){toggleOpt('ignoreWhitespace','optWs');});
  $('optCase').addEventListener('click',function(){toggleOpt('ignoreCase','optCase');});
  $('optNum').addEventListener('click',function(){toggleOpt('showLineNumbers','optNum');});
  $('optWrap').addEventListener('click',function(){toggleOpt('wrapLines','optWrap');});
  $('optOnly').addEventListener('click',function(){toggleOpt('onlyShowDifferences','optOnly');});
  // stats
  $('searchInput').addEventListener('input',function(){state.searchQuery=this.value;$('searchClear').hidden=!this.value;renderDiff();});
  $('searchClear').addEventListener('click',function(){state.searchQuery='';$('searchInput').value='';this.hidden=true;renderDiff();});
  $('prevDiff').addEventListener('click',prevDiff);
  $('nextDiff').addEventListener('click',nextDiff);
  // edit inputs
  $('leftInput').addEventListener('input',function(){state.leftText=this.value;renderEditStats();recompute();});
  $('rightInput').addEventListener('input',function(){state.rightText=this.value;renderEditStats();recompute();});
  $('tabLeft').addEventListener('click',function(){state.mobileTab='left';$('panelLeft').classList.remove('hide-m');$('panelRight').classList.add('hide-m');$('tabLeft').classList.add('active');$('tabRight').classList.remove('active');});
  $('tabRight').addEventListener('click',function(){state.mobileTab='right';$('panelRight').classList.remove('hide-m');$('panelLeft').classList.add('hide-m');$('tabRight').classList.add('active');$('tabLeft').classList.remove('active');});
  // panel toolbar buttons
  document.querySelectorAll('[data-fmt]').forEach(function(b){b.addEventListener('click',function(){fmtJson(this.getAttribute('data-fmt'));});});
  document.querySelectorAll('[data-sort]').forEach(function(b){b.addEventListener('click',function(){sortLines(this.getAttribute('data-sort'));});});
  document.querySelectorAll('[data-trim]').forEach(function(b){b.addEventListener('click',function(){trimEmpty(this.getAttribute('data-trim'));});});
  document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){copyPanel(this.getAttribute('data-copy'));});});
  document.querySelectorAll('[data-up]').forEach(function(b){b.addEventListener('click',function(){this.parentElement.querySelector('.file-in').click();});});
  document.querySelectorAll('.file-in').forEach(function(inp){inp.addEventListener('change',function(){var f=this.files[0];if(!f)return;var side=this.getAttribute('data-side');var r=new FileReader();r.onload=function(e){setSide(side,String(e.target.result));};r.readAsText(f);this.value='';});});
  // drag & drop on panels
  ['panelLeft','panelRight'].forEach(function(pid){var p=$(pid);p.addEventListener('dragover',function(e){e.preventDefault();});p.addEventListener('drop',function(e){e.preventDefault();var f=e.dataTransfer.files[0];if(!f)return;var side=pid==='panelLeft'?'left':'right';var r=new FileReader();r.onload=function(ev){setSide(side,String(ev.target.result));};r.readAsText(f);});});
  // footer
  $('footHelp').addEventListener('click',openHelp);
  $('footExport').addEventListener('click',openExport);
  // modals
  document.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',function(){if(this.getAttribute('data-close')==='export')closeExport();else closeHelp();});});
  $('exportModal').addEventListener('click',function(e){if(e.target===this)closeExport();});
  $('helpModal').addEventListener('click',function(e){if(e.target===this)closeHelp();});
  $('dlApp').addEventListener('click',dlApp);
  $('dlPatch').addEventListener('click',dlPatch);
  $('dlHtml').addEventListener('click',dlHtml);
  $('cpPatch').addEventListener('click',cpPatch);
  $('cpJson').addEventListener('click',cpJson);
  // shortcuts list
  var sc=[['Alt + N','Jump to Next Difference'],['Alt + P','Jump to Previous Difference'],['Alt + S','Swap Original & Modified texts'],['Alt + E','Open Export modal'],['Alt + C','Clear both text panes'],['Alt + H','Open Shortcuts & Help']];
  var sl=$('scList');sc.forEach(function(s){var d=document.createElement('div');d.className='sc-row';d.innerHTML='<span class="sc-l">'+s[1]+'</span><kbd>'+s[0]+'</kbd>';sl.appendChild(d);});
  // keyboard shortcuts
  document.addEventListener('keydown',function(e){
    var tag=document.activeElement&&document.activeElement.tagName;
    if(tag==='TEXTAREA'||tag==='INPUT')return;
    if(e.altKey&&(e.key==='n'||e.key==='N'||e.key==='ArrowDown')){e.preventDefault();nextDiff();}
    else if(e.altKey&&(e.key==='p'||e.key==='P'||e.key==='ArrowUp')){e.preventDefault();prevDiff();}
    else if(e.altKey&&(e.key==='s'||e.key==='S')){e.preventDefault();swap();}
    else if(e.altKey&&(e.key==='e'||e.key==='E')){e.preventDefault();openExport();}
    else if(e.altKey&&(e.key==='c'||e.key==='C')){e.preventDefault();clear();}
    else if(e.altKey&&(e.key==='h'||e.key==='H')){e.preventDefault();openHelp();}
  });
  // initial render
  applyTheme();
  setEdit(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();