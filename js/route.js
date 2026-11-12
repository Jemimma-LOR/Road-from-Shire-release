/* Shared cubic geometry for atlas and preview; preserve the original Shire prefix. */
(function(root){
 function create(points,sections,geography={}){
  const svgPath=d=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);return p;};
  const slopes=points.slice(1).map((p,i)=>(p.y-points[i].y)/(p.x-points[i].x));
  const tangents=points.map((p,i)=>{if(i===0)return slopes[0];if(i===points.length-1)return slopes.at(-1);const a=slopes[i-1],b=slopes[i];return a*b<=0?0:2*a*b/(a+b);});
  const commands=[],lengths=[0];let d=`M ${points[0].x} ${points[0].y}`;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=(b.x-a.x)/3;
   // Harmonic tangents keep the curve inside each segment's geographic bounds.
   const command=`C ${a.x+dx} ${a.y+dx*tangents[i-1]} ${b.x-dx} ${b.y-dx*tangents[i]} ${b.x} ${b.y}`;
   commands.push(command);d+=' '+command;lengths.push(svgPath(d).getTotalLength());
  }
  if(geography.extensions?.length){
   const count=geography.keepOriginalSegments;
   d=`M ${points[0].x} ${points[0].y} ${commands.slice(0,count).join(' ')}`;
   lengths.splice(count+1);
   for(const extension of geography.extensions){d+=' C '+[...extension.c1,...extension.c2,...extension.end].join(' ');lengths.push(svgPath(d).getTotalLength());}
  }
  const path=svgPath(d),length=path.getTotalLength();
  const knotDistance=k=>{const i=Math.floor(k);return lengths[i]+(k-i)*((lengths[i+1]??lengths[i])-lengths[i]);};
  const ranges=sections.map(section=>({...section,startLength:knotDistance(section.startKnot),endLength:knotDistance(section.endKnot)}));
  function distanceAtSteps(steps){
   if(steps<=0)return 0;
   for(const range of ranges)if(steps<range.endSteps){const fraction=Math.max(0,(steps-range.startSteps)/(range.endSteps-range.startSteps));return range.startLength+fraction*(range.endLength-range.startLength);}
   return ranges.at(-1).endLength;
  }
  const pointAtDistance=distance=>path.getPointAtLength(Math.max(0,Math.min(length,distance)));
  return {d,length,lengths,distanceAtSteps,pointAtDistance};
 }
 root.RouteGeometry={create};
})(window);
