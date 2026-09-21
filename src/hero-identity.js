const pools={
 barbarian:['라그나','브란','가르온','토르반','울릭','볼프','드라크','카르도','로칸','바르크'],
 necromancer:['모르트','카인','세베른','아르켄','녹스','벨라크','오르딘','루시안','네르갈','에레온'],
 sorceress:['에이라','세레나','이리스','루나','엘리아','리시아','셀레네','아델라','니아','미레나'],
 amazon:['발레리아','카산드라','리브','아스트라','프레야','레오나','탈리아','브리나','실비아','로웨나'],
 paladin:['레온','테오','아르덴','가브리엘','로웬','베른','에드릭','롤란','세드릭','알드릭']
};
export function defaultHeroName(classId,index=0){const list=pools[classId]||pools.paladin;return list[index%list.length]+(index>=list.length?` ${Math.floor(index/list.length)+1}`:'');}
const hues=['#cf9a66','#7eb6bd','#b184b9','#829a64','#bd7770','#909fc7','#b7ab7e'];
export function personalTint(h){return hues[(Number(h.id.slice(1))||0)%hues.length];}
export function renameHero(h,value){
 const name=typeof value==='string'?value.normalize('NFC').trim().replace(/\s+/g,' '):'';
 if(!/^[\p{L}\p{N} ]{1,12}$/u.test(name))return {ok:false,message:'한글·영문·숫자 1~12자'};
 h.name=name;h.nameRevision=1;h.customName=true;return {ok:true};
}
