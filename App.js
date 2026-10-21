import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, PanResponder, Animated, Easing } from 'react-native';

export default function App(){
  const [screen,setScreen]=useState('splash');
  const [countdown,setCountdown]=useState(5);
  const [license,setLicense]=useState('');
  const [ssid,setSsid]=useState('');
  const [masterSSID,setMasterSSID]=useState('');
  const [percent,setPercent]=useState(45);
  const [amount,setAmount]=useState('1000');
  const [amountError,setAmountError]=useState('');
  const [masterName,setMasterName]=useState('Trader_ProX12');
  const [adminTrading,setAdminTrading]=useState(false);
  const [authText,setAuthText]=useState('');
  const [telegramID,setTelegramID]=useState('');
  const [logs,setLogs]=useState([]);
  const [liveTrades,setLiveTrades]=useState([]);
  const [nowTick,setNowTick]=useState(new Date());
  const ALLOWED_ADMIN_ID='7608285065';
  const [users,setUsers]=useState([{id:'1', license:'CPY-0001-PLX-0001', ssid:'42***demo', activated:'12 Sept 2024', expiry:'12 Oct 2024', expiryDate:new Date(new Date().setDate(new Date().getDate()+30)).toISOString(), status:'Active', percent:45, amount:'1000'}]);
  const [licenses,setLicenses]=useState([{no:1, key:'CPY-0001-PLX-0001', exp:'30 days', usedBy:'Available', attachedSSID:null, expiryDate:null},{no:2, key:'CPY-0002-PLX-0002', exp:'30 days', usedBy:'Available', attachedSSID:null, expiryDate:null}]);
  const [serialCounter,setSerialCounter]=useState(3);
  const masterWS=useRef(null);
  const pulse=useRef(new Animated.Value(1)).current;
  const fade=useRef(new Animated.Value(0)).current;
  const slide=useRef(new Animated.Value(30)).current;
  const glow=useRef(new Animated.Value(0)).current;
  const countScale=useRef(new Animated.Value(1)).current;
  const splashProgress=useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    if(screen==='splash'){
      Animated.timing(splashProgress,{toValue:1,duration:5000,useNativeDriver:false}).start();
      const interval=setInterval(()=>{
        setCountdown(c=>{
          if(c<=1){
            clearInterval(interval);
            Animated.timing(fade,{toValue:0,duration:300,useNativeDriver:true}).start(()=>setScreen('welcome'));
            return 0;
          }
          Animated.sequence([
            Animated.timing(countScale,{toValue:1.4,duration:150,useNativeDriver:true}),
            Animated.timing(countScale,{toValue:1,duration:150,useNativeDriver:true})
          ]).start();
          return c-1;
        });
      },1000);
      return ()=>clearInterval(interval);
    }
  },[screen]);

  useEffect(()=>{
    Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1.15,duration:1000,easing:Easing.inOut(Easing.ease),useNativeDriver:true}), Animated.timing(pulse,{toValue:1,duration:1000,easing:Easing.inOut(Easing.ease),useNativeDriver:true})])).start(); 
    Animated.timing(fade,{toValue:1,duration:800,useNativeDriver:true}).start(); 
    Animated.timing(slide,{toValue:0,duration:600,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(); 
    Animated.loop(Animated.timing(glow,{toValue:1,duration:2000,easing:Easing.inOut(Easing.ease),useNativeDriver:false})).start(); 
    const id=setInterval(()=>setNowTick(new Date()),60000); return ()=>clearInterval(id);
  },[screen]);

  const sliderWidth=280;
  const pan=useRef(PanResponder.create({ 
    onStartShouldSetPanResponder:()=>true, 
    onMoveShouldSetPanResponder:()=>true, 
    onPanResponderGrant:(e,g)=>{
      let x=g.x0-40; 
      if(x<0)x=0; if(x>sliderWidth)x=sliderWidth; 
      setPercent(Math.max(1,Math.round((x/sliderWidth)*100)));
    },
    onPanResponderMove:(e,g)=>{ 
      let x=g.moveX-40; 
      if(x<0)x=0; if(x>sliderWidth)x=sliderWidth; 
      setPercent(Math.max(1,Math.round((x/sliderWidth)*100))); 
    } 
  })).current;
  const addLog=(t)=> setLogs(l=>[`[${new Date().toLocaleTimeString()}] ${t}`,...l].slice(0,50));
  const isValidSSID=(s)=>{ if(!s) return false; if(!s.startsWith('42')) return false; if(s.length < 80) return false; if(s.includes('***')) return false; if(s.includes(' ')) return false; return true; };
  const getExpiryAt2359WAT=(days=30)=>{ const d=new Date(); d.setDate(d.getDate()+days); d.setHours(23,59,59,999); return d; };
  const getDaysLeft=(expiryISO)=>{ if(!expiryISO) return 30; const exp=new Date(expiryISO); const diff=exp-nowTick; const days=Math.ceil(diff/86400000); return days<0?0:days; };
  const formatExpiry=(iso)=>{ if(!iso) return '30 days'; const d=new Date(iso); return d.toLocaleDateString()+' 23:59 WAT ('+getDaysLeft(iso)+' days left)'; };
  const connectMasterPhoneServer=()=>{ if(!isValidSSID(masterSSID)){Alert.alert('Enter Real Master SSID','Master SSID must be real 80+ chars starting with 42...');return;} if(masterWS.current) masterWS.current.close(); addLog(`Connecting ${masterName}...`); const ws=new WebSocket('wss://api-eu.po.trade/socket.io/?EIO=4&transport=websocket'); masterWS.current=ws; ws.onopen=()=>{addLog('Master Connected ✓'); ws.send('40'); setTimeout(()=>{ws.send('42["auth",{"session":"'+masterSSID+'","isDemo":0}]'); addLog('Listening for trades...');},1000);}; ws.onmessage=(e)=>{const msg=e.data; if(msg.includes('openOrder')||msg.includes('binaryOptionsOpened')){addLog('TRADE DETECTED!'); try{const m=msg.substring(msg.indexOf('[')); const arr=JSON.parse(m); const d=arr[1]; const trade={asset:d.asset||'EURUSD_otc',dir:(d.action==='call'||d.direction==='buy')?'BUY':'SELL',amount:d.amount||1000,time:new Date().toLocaleTimeString()}; setLiveTrades(t=>[trade,...t].slice(0,20)); copyToAllUsersPhone(trade);}catch{}} if(msg==='2') ws.send('3');}; ws.onclose=()=>{addLog('Disconnected'); if(adminTrading) setTimeout(connectMasterPhoneServer,5000);}; };
  const copyToAllUsersPhone=(mt)=>{users.forEach(u=>{ if(!isValidSSID(u.ssid))return; if(getDaysLeft(u.expiryDate)===0) return; const amt=Math.max(parseInt(u.amount||1000),Math.round(mt.amount*(u.percent||percent)/100)); addLog(`Copy ${u.license}: ${mt.asset} ${mt.dir} $${amt}`); placeTradeForUserPhone(u.ssid,mt.asset,mt.dir,amt);});};
  const placeTradeForUserPhone=(uid,asset,dir,amt)=>{ try{ const ws=new WebSocket('wss://api-eu.po.trade/socket.io/?EIO=4&transport=websocket'); ws.onopen=()=>{ ws.send('40'); setTimeout(()=>{ ws.send('42["auth",{"session":"'+uid+'","isDemo":0}]'); setTimeout(()=>{ const action=dir==='BUY'?'call':'put'; ws.send(`42["openOrder",{"asset":"${asset}","action":"${action}","amount":${amt},"time":60}]`); addLog(`✓ Sent to ${uid.slice(0,8)}...`); setTimeout(()=>ws.close(),3000);},1000);},500);}; }catch(e){addLog('Fail '+e.message);} };
  const toggleCopySignal=()=>{ const ns=!adminTrading; setAdminTrading(ns); if(ns){ connectMasterPhoneServer(); Alert.alert('🔥 PHONE SERVER LIVE','Keep app open!'); }else{ if(masterWS.current) masterWS.current.close(); addLog('Stopped'); } };
  const verify=()=>{
    const key=license.toUpperCase().trim();
    const found=licenses.find(l=>l.key===key);
    if(!found){ Alert.alert('Invalid License ❌','This license does NOT exist.\nOnly licenses generated by Admin are valid.'); return; }
    if(found.expiryDate && getDaysLeft(found.expiryDate)===0){ Alert.alert('License Expired ❌','This license expired.\nContact admin to renew.'); return; }
    setAuthText('Authenticating...');
    setTimeout(()=>{
      setAuthText('Connected ✓ 30 Days - 23:59 WAT Reset');
      const expiryDate=getExpiryAt2359WAT(30);
      if(found.usedBy==='Available'){ setLicenses(prev=>prev.map(l=>l.key===key?{...l,usedBy:key,expiryDate:expiryDate.toISOString()}:l)); }
      const now=new Date();
      setUsers(u=>[{id:Date.now().toString(),license:key,ssid:'Not set',activated:now.toLocaleDateString(),expiry:expiryDate.toLocaleDateString(),expiryDate:expiryDate.toISOString(),status:'Active',percent,amount},...u]);
      setTimeout(()=>{setAuthText(''); setScreen('broker');},800);
    },1000);
  };
  const handleBrokerConnect=()=>{
    if(!isValidSSID(ssid)){ Alert.alert('Invalid SSID ❌','Real SSID required:\n• Starts with 42\n• 80+ characters'); return; }
    const key=license.toUpperCase().trim();
    const found=licenses.find(l=>l.key===key);
    if(!found){ Alert.alert('Invalid License ❌','License not found'); return; }
    if(found.attachedSSID && found.attachedSSID!==ssid){
      Alert.alert('Invalid User ❌','This license is attached to another account.\nOne license = One user alone.');
      return;
    }
    if(!found.attachedSSID){
      setLicenses(prev=>prev.map(l=>l.key===key?{...l,attachedSSID:ssid,usedBy:key}:l));
      setUsers(prev=>prev.map(u=>u.license===key?{...u,ssid:ssid}:u));
    } else {
      setUsers(prev=>prev.map(u=>u.license===key?{...u,ssid:ssid}:u));
    }
    setScreen('copy');
  };
  const verifyTelegramAdmin=()=>{ if(telegramID.trim()===ALLOWED_ADMIN_ID) setScreen('admin'); else Alert.alert('Access Denied','Invalid Admin Credentials'); };
  const generateLicense=()=>{ const num=serialCounter.toString().padStart(4,'0'); const key=`CPY-${num}-PLX-${num}`; setLicenses([{no:serialCounter,key,exp:'30 days',usedBy:'Available',attachedSSID:null,expiryDate:null},...licenses]); setSerialCounter(serialCounter+1); Alert.alert('✨ Generated','Serial #'+num+'\n'+key); };

  const BackBtn=({to})=> (<TouchableOpacity style={s.backBtn} onPress={()=>setScreen(to)}><Text style={s.back}>← Back</Text></TouchableOpacity>);
  const BottomNav=()=> (<View style={s.bottomNav}><TouchableOpacity style={s.navItem} onPress={()=>setScreen('dashboard')}><Text style={[s.navIcon, screen==='dashboard'&&s.navActive]}>🏠</Text><Text style={[s.navText, screen==='dashboard'&&s.navActive]}>Home</Text></TouchableOpacity><TouchableOpacity style={s.navItem} onPress={()=>setScreen('tradeHistory')}><Text style={[s.navIcon, screen==='tradeHistory'&&s.navActive]}>📈</Text><Text style={[s.navText, screen==='tradeHistory'&&s.navActive]}>Trades</Text></TouchableOpacity><TouchableOpacity style={s.navItem} onPress={()=>setScreen('copy')}><Text style={[s.navIcon, screen==='copy'&&s.navActive]}>⚙️</Text><Text style={[s.navText, screen==='copy'&&s.navActive]}>Settings</Text></TouchableOpacity><TouchableOpacity style={s.navItem} onPress={()=>setScreen('history')}><Text style={[s.navIcon, screen==='history'&&s.navActive]}>🎫</Text><Text style={[s.navText, screen==='history'&&s.navActive]}>License</Text></TouchableOpacity><TouchableOpacity style={s.navItem} onPress={()=>Linking.openURL('https://t.me/tradexa_support')}><Text style={s.navIcon}>💬</Text><Text style={s.navText}>Admin</Text></TouchableOpacity></View>);

  if(screen==='splash') return (
    <View style={s.splashBg}>
      <View style={s.splashGlow1}/><View style={s.splashGlow2}/>
      <Animated.View style={[s.splashCenter,{opacity:fade}]}>
        <Animated.View style={[s.splashLogoBox,{transform:[{scale:pulse}]}]}>
          <Text style={s.splashRocket}>🚀</Text>
        </Animated.View>
        <Text style={s.splashTitle}>TRADEXA AI</Text>
        <Text style={s.splashSub}>BOT</Text>
        <View style={s.countdownBox}>
          <Animated.Text style={[s.countdownNum,{transform:[{scale:countScale}]}]}>{countdown}</Animated.Text>
          <Text style={s.countdownLabel}>Loading...</Text>
        </View>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill,{width:splashProgress.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}]}/>
        </View>
        <Text style={s.splashFooter}>Secure • Encrypted • Protected</Text>
      </Animated.View>
    </View>
  );

  if(screen==='welcome') return (<View style={s.bg}><View style={s.glow1}/><View style={s.glow2}/><View style={s.centeredWrapper}><Animated.View style={[s.centerContent,{opacity:fade,transform:[{translateY:slide}]}]}><Animated.View style={[s.rocketBox,{transform:[{scale:pulse}]}]}><View style={s.rocketGlow}><Text style={s.rocket}>🚀</Text></View></Animated.View><Text style={s.h1}>TRADEXA AI</Text><Text style={s.h1Bot}>BOT</Text><View style={s.badgeRow}><View style={s.liveDot}/><Text style={s.liveText}>LIVE • PHONE SERVER</Text></View><Text style={s.sub}>Automated Copy Trading{'\n'}Powered by AI • Real Trades</Text><TouchableOpacity style={s.bigBtn} onPress={()=>setScreen('license')}><View style={s.btnGlow}/><Text style={s.bigBt}>Start Copying  →</Text></TouchableOpacity><View style={s.statsMini}><View style={s.miniCard}><Text style={s.miniV}>2.4k+</Text><Text style={s.miniL}>Traders</Text></View><View style={s.miniCard}><Text style={s.miniV}>98.7%</Text><Text style={s.miniL}>Success</Text></View><View style={s.miniCard}><Text style={s.miniV}>24/7</Text><Text style={s.miniL}>Copy</Text></View></View><Text style={s.ver}>v2.0 • Secure •</Text><TouchableOpacity onPress={()=>setScreen('adminLogin')}><Text style={s.hiddenAdmin}>🔐 Admin Access</Text></TouchableOpacity></Animated.View></View></View>);

  if(screen==='license') return (<View style={s.bg}><View style={s.glow1}/><View style={s.topBack}><BackBtn to='welcome'/></View><View style={s.centeredWrapper}><Animated.View style={[s.centerCard,{opacity:fade}]}><Text style={s.title}>License Activation</Text><Text style={s.desc}>One license = One user alone • Attached to your SSID • Any device</Text><View style={s.iconBox}><Text style={s.icon}>🔑</Text><View style={s.iconGlow}/></View><View style={s.inputWrap}><TextInput style={s.input} placeholder='CPY-0001-PLX-0001' placeholderTextColor='#4A5A7A' value={license} onChangeText={setLicense} autoCapitalize='characters'/></View>{authText!==''&&<View style={s.successBox}><Text style={s.auth}>{authText}</Text></View>}<TouchableOpacity style={s.bigBtn} onPress={verify}><Text style={s.bigBt}>Verify & Continue ✨</Text></TouchableOpacity><TouchableOpacity style={s.outlineBtn} onPress={()=>Linking.openURL('https://t.me/tradexa_support')}><Text style={s.outlineT}>Contact Admin @tradexa_support</Text></TouchableOpacity></Animated.View></View></View>);

  if(screen==='broker') return (<View style={s.bg}><View style={s.topBack}><BackBtn to='license'/></View><ScrollView contentContainerStyle={s.scrollCenter}><View style={s.centerCard}><Text style={s.title}>Connect Broker - SSID Locked</Text><Text style={s.desc}>License will be attached to this SSID permanently</Text><View style={s.cardPremium}><View style={s.cardHeader}><Text style={s.cardTitle}>🔒 Private SSID - License Attached</Text><View style={s.activeBadge}><Text style={s.activeBadgeT}>LOCKED</Text></View></View><TextInput style={s.inputDark} placeholder='42... 100+ characters' placeholderTextColor='#4A5A7A' value={ssid} onChangeText={setSsid}/><View style={s.ssidSteps}><Text style={s.ssidStepsTitle}>📖 How to get your SSID:</Text><Text style={s.ssidStep}>1️⃣ Login to PocketOption.com on Chrome</Text><Text style={s.ssidStep}>2️⃣ Press F12 → Go to Application tab</Text><Text style={s.ssidStep}>3️⃣ Left side: Storage → Cookies → https://pocketoption.com</Text><Text style={s.ssidStep}>4️⃣ Find cookie named ssid → Copy full value</Text><Text style={s.ssidStep}>5️⃣ Must start with 42... and be 80+ characters long</Text><Text style={s.ssidStep}>6️⃣ Paste here - Keep it private, never share!</Text></View></View><TouchableOpacity style={s.bigBtn} onPress={handleBrokerConnect}><Text style={s.bigBt}>Connect & Lock to SSID →</Text></TouchableOpacity></View></ScrollView></View>);

  if(screen==='copy') return (<View style={s.bg}><View style={s.topBack}><BackBtn to={users[0]?.ssid!=='42***demo'?'dashboard':'broker'}/></View><ScrollView contentContainerStyle={s.scrollCenter}><View style={s.centerCard}><Text style={s.title}>Copy Settings</Text><View style={s.cardPremium}><View style={s.cardHeader}><Text style={s.cardTitle}>📊 Copy Percentage</Text><View style={s.percentBadge}><Text style={s.percentT}>{percent}%</Text></View></View><View style={s.sliderContainer}><View style={s.sliderArea} {...pan.panHandlers}><View style={[s.sliderTrack,{width:sliderWidth}]}><View style={[s.sliderTrackBg]}/><Animated.View style={[s.sliderFill,{width:`${percent}%`}]}/><View style={[s.sliderThumbOuter,{left:`${percent}%`}]}><Animated.View style={[s.sliderThumb,{transform:[{scale:pulse}]}]}><View style={s.sliderThumbInner}/></Animated.View></View></View></View><View style={s.sliderLabels}><Text style={s.sliderLabel}>1%</Text><Text style={s.sliderLabelMid}>50%</Text><Text style={s.sliderLabel}>100%</Text></View></View><View style={s.chipRow}>{[10,25,45,75,100].map(v=><TouchableOpacity key={v} style={[s.miniChip,percent===v&&s.miniChipOn]} onPress={()=>setPercent(v)}><Text style={[s.miniChipT,percent===v&&{color:'#fff'}]}>{v}%</Text></TouchableOpacity>)}</View></View><View style={s.cardPremium}><Text style={s.cardTitle}>💰 Trade Amount - Min ₦1,000</Text><TextInput style={s.inputDark} value={amount} onChangeText={(v)=>{setAmount(v); setAmountError(v===''||parseInt(v)<1000?'Min ₦1,000':'');}} keyboardType='numeric'/>{amountError!==''&&<Text style={s.error}>{amountError}</Text>}</View><TouchableOpacity style={s.bigBtn} onPress={()=>setScreen('dashboard')}><Text style={s.bigBt}>Save & Go Live 🚀</Text></TouchableOpacity></View><View style={{height:100}}/></ScrollView><BottomNav/></View>);

  if(screen==='dashboard') return (<View style={s.bg}><View style={s.topBack}><BackBtn to='copy'/></View><ScrollView contentContainerStyle={s.scrollCenter}><View style={s.centerCard}><Text style={s.title}>Dashboard</Text><View style={s.cardPremium}><View style={s.rowBetween}><Text style={[s.activeDot,{color:adminTrading?'#00FF88':'#FFAA00'}]}>{adminTrading?'● LIVE COPYING':'○ Waiting for Admin Signal'}</Text><Text style={s.masterPill}>{masterName}</Text></View><View style={{marginTop:12,flexDirection:'row',gap:8}}><View style={s.statBig}><Text style={s.statBigV}>{percent}%</Text><Text style={s.statBigL}>Copy %</Text></View><View style={s.statBig}><Text style={s.statBigV}>₦{amount}</Text><Text style={s.statBigL}>Min Amount</Text></View><View style={s.statBig}><Text style={s.statBigV}>{getDaysLeft(users[0]?.expiryDate)}d</Text><Text style={s.statBigL}>Days Left</Text></View></View><Text style={s.smallDesc}>SSID Locked • Resets 23:59 WAT • {nowTick.toLocaleTimeString()}</Text></View><View style={s.cardPremium}><Text style={s.cardTitle}>🔥 Quick Actions</Text><View style={s.actionGrid}><TouchableOpacity style={s.actionBtn} onPress={()=>setScreen('copy')}><Text style={s.actionIcon}>⚙️</Text><Text style={s.actionT}>Change Settings</Text></TouchableOpacity><TouchableOpacity style={s.actionBtn} onPress={()=>setScreen('tradeHistory')}><Text style={s.actionIcon}>📈</Text><Text style={s.actionT}>Live Trades</Text></TouchableOpacity><TouchableOpacity style={s.actionBtn} onPress={()=>setScreen('history')}><Text style={s.actionIcon}>🎫</Text><Text style={s.actionT}>License</Text></TouchableOpacity><TouchableOpacity style={s.actionBtn} onPress={()=>Linking.openURL('https://t.me/tradexa_support')}><Text style={s.actionIcon}>💬</Text><Text style={s.actionT}>Contact Admin</Text></TouchableOpacity></View></View></View><View style={{height:100}}/></ScrollView><BottomNav/></View>);

  if(screen==='tradeHistory') return (<View style={s.bg}><View style={s.topBack}><BackBtn to='dashboard'/></View><ScrollView contentContainerStyle={s.scrollCenter}><View style={s.centerCard}><Text style={s.title}>Live Trade History</Text><Text style={s.desc}>Real trades copied from admin master account</Text><View style={s.cardPremium}><View style={s.rowBetween}><Text style={s.cardTitle}>📡 Live Trades</Text><View style={[s.activeBadge,{backgroundColor:adminTrading?'#0A2A1A':'#2A1A0A',borderColor:adminTrading?'#00FF88':'#FFAA00'}]}><Text style={[s.activeBadgeT,{color:adminTrading?'#00FF88':'#FFAA00'}]}>{adminTrading?'LIVE':'OFFLINE'}</Text></View></View>{liveTrades.length===0?<View style={s.emptyBox}><Text style={s.emptyIcon}>📭</Text><Text style={s.infoT}>No trades yet{'\n'}When admin trades, trades appear here instantly</Text></View>:liveTrades.map((t,i)=><View key={i} style={s.tradeRow}><View style={s.tradeLeft}><Text style={s.tradeAsset}>{t.asset}</Text><Text style={s.tradeTime}>{t.time}</Text></View><View style={[s.tradeDirBadge,{backgroundColor:t.dir==='BUY'?'#0A2A1A':'#2A0A0A',borderColor:t.dir==='BUY'?'#00FF88':'#FF3A5A'}]}><Text style={[s.tradeDirT,{color:t.dir==='BUY'?'#00FF88':'#FF3A5A'}]}>{t.dir}</Text></View><Text style={s.tradeAmt}>${t.amount}</Text></View>)}</View><TouchableOpacity style={s.outlineBtn} onPress={()=>setLiveTrades([])}><Text style={s.outlineT}>Clear History</Text></TouchableOpacity></View><View style={{height:100}}/></ScrollView><BottomNav/></View>);

  if(screen==='history') return (<View style={s.bg}><View style={s.topBack}><BackBtn to='dashboard'/></View><ScrollView contentContainerStyle={s.scrollCenter}><View style={s.centerCard}><Text style={s.title}>License History - SSID Locked</Text><View style={s.cardPremium}><Text style={s.cardTitle}>🔑 License Key - Attached to SSID</Text><View style={s.sepBoxPremium}><Text style={s.sepV}>{license||'CPY-0001-PLX-0001'}</Text><TouchableOpacity style={s.copySmall} onPress={()=>Alert.alert('Copied',license)}><Text style={s.copySmallT}>COPY</Text></TouchableOpacity></View><Text style={s.smallDesc}>Works on any device/PC/phone with same SSID only</Text></View><View style={s.cardPremium}><Text style={s.cardTitle}>📅 Activation Date</Text><View style={s.sepBoxPremium}><Text style={s.sepV}>{new Date().toLocaleDateString()} • {nowTick.toLocaleTimeString()} WAT</Text></View></View><View style={s.cardPremium}><Text style={s.cardTitle}>⏰ Expiry - 23:59 WAT Daily Reset</Text><View style={s.sepBoxPremium}><Text style={s.sepV}>{formatExpiry(users[0]?.expiryDate)}</Text></View><View style={s.tipBox}><Text style={s.tipIcon}>🔒</Text><Text style={s.tipT}>Locked to your SSID • {getDaysLeft(users[0]?.expiryDate)} days left • Any device with same SSID works • Different SSID will show Invalid User.</Text></View></View><TouchableOpacity style={s.bigBtn} onPress={()=>Linking.openURL('https://t.me/tradexa_support')}><Text style={s.bigBt}>Renew License - Contact Admin 💬</Text></TouchableOpacity></View><View style={{height:100}}/></ScrollView><BottomNav/></View>);

  if(screen==='adminLogin') return (<View style={s.bg}><View style={s.glow1}/><View style={s.topBack}><BackBtn to='welcome'/></View><View style={s.centeredWrapper}><View style={s.centerCard}><Text style={s.title}>Admin Access</Text><View style={s.iconBox}><Text style={s.icon}>🛡️</Text></View><Text style={s.desc}>Enter Admin Credentials to access control panel</Text><View style={s.inputWrap}><TextInput style={s.input} value={telegramID} onChangeText={setTelegramID} placeholder='Enter Admin ID' placeholderTextColor='#4A5A7A' keyboardType='numeric' secureTextEntry/></View><TouchableOpacity style={s.bigBtn} onPress={verifyTelegramAdmin}><Text style={s.bigBt}>Verify & Enter 🔐</Text></TouchableOpacity></View></View></View>);

  return (
    <View style={s.bg}><View style={s.glow1}/><View style={s.topBack}><BackBtn to='welcome'/></View><ScrollView contentContainerStyle={s.scrollCenter}><View style={s.centerCardWide}>
      <Text style={s.title}>Admin Phone Server</Text><View style={s.idBadge}><View style={s.liveDot}/><Text style={s.idBadgeT}>Admin Panel • SSID Locked Licenses • LIVE</Text></View>
      <View style={s.cardPremium}><Text style={s.cardTitle}>⚡ Master Trader SSID</Text><Text style={s.smallDesc}>Real SSID only - 80+ chars. Change anytime - users keep copying</Text><TextInput style={s.inputDark} value={masterSSID} onChangeText={setMasterSSID} placeholder='Master SSID 42...'/><TextInput style={s.inputDark} value={masterName} onChangeText={setMasterName} placeholder='Trader Name'/><TouchableOpacity style={s.bigBtnSmall} onPress={()=>Alert.alert('Saved','Master saved')}><Text style={s.bigBt}>Save Master</Text></TouchableOpacity><TouchableOpacity style={[s.bigBtn,{backgroundColor:adminTrading?'#FF3A5A':'#00C853',marginTop:12}]} onPress={toggleCopySignal}><Text style={s.bigBt}>{adminTrading?'■ STOP SERVER':'▶ START PHONE SERVER 🔥'}</Text></TouchableOpacity></View>
      <View style={s.cardPremium}><Text style={s.cardTitle}>📡 Live Logs</Text><ScrollView style={{maxHeight:120}}>{logs.map((lg,i)=><Text key={i} style={s.logT}>{lg}</Text>)} {logs.length===0&&<Text style={s.infoT}>Start server & trade to see logs</Text>}</ScrollView></View>
      <View style={s.cardPremium}><Text style={s.cardTitle}>👥 Active Users - SSID Locked</Text>{users.map(u=><View key={u.id} style={s.userCardPremium}><View style={s.sepBoxPremium}><Text style={s.sepL}>LICENSE</Text><Text style={s.sepV}>{u.license}</Text></View><View style={s.sepBoxPremium}><Text style={s.sepL}>SSID LOCKED</Text><Text style={s.sepV}>{u.ssid.slice(0,12)}... • Any device with this SSID</Text></View><View style={s.row}><View style={[s.sepBoxPremium,{flex:1,marginRight:4}]}><Text style={s.sepL}>ACTIVATED</Text><Text style={s.sepV}>{u.activated}</Text></View><View style={[s.sepBoxPremium,{flex:1,marginLeft:4}]}><Text style={s.sepL}>DAYS LEFT</Text><Text style={s.sepV}>{getDaysLeft(u.expiryDate)} days - 23:59 WAT</Text></View></View></View>)}</View>
      <View style={s.cardPremium}><View style={s.cardHeader}><Text style={s.cardTitle}>🎫 Serial Licenses - SSID Locked</Text><TouchableOpacity style={s.genBtn} onPress={generateLicense}><Text style={s.genBtnT}>+ Generate</Text></TouchableOpacity></View>{licenses.map(l=><View key={l.no} style={s.licenseRowPremium}><View style={s.serialBadge}><Text style={s.serialT}>#{l.no.toString().padStart(4,'0')}</Text></View><View style={{flex:1}}><Text style={s.lineV}>{l.key}</Text><Text style={s.smallDesc}>{!l.attachedSSID?'Available - Not attached yet':`Locked to SSID ${l.attachedSSID.slice(0,8)}... • ${getDaysLeft(l.expiryDate)}d left`}</Text></View><TouchableOpacity style={s.copyBtn} onPress={()=>Alert.alert('License',l.key)}><Text style={s.copyBtnT}>{!l.attachedSSID?'COPY':'LOCKED'}</Text></TouchableOpacity></View>)}</View>
    </View></ScrollView></View>
  );
}
const s=StyleSheet.create({
  splashBg:{flex:1,backgroundColor:'#050A18',justifyContent:'center',alignItems:'center'}, splashGlow1:{position:'absolute',top:-120,left:-120,width:350,height:350,backgroundColor:'#2F80ED',opacity:0.2,borderRadius:175}, splashGlow2:{position:'absolute',bottom:-100,right:-100,width:300,height:300,backgroundColor:'#00FF88',opacity:0.12,borderRadius:150},
  splashCenter:{alignItems:'center',justifyContent:'center',padding:30}, splashLogoBox:{width:110,height:110,borderRadius:28,backgroundColor:'#0E1E3D',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#2F80ED',shadowColor:'#2F80ED',shadowOpacity:0.6,shadowRadius:20}, splashRocket:{fontSize:50}, splashTitle:{color:'#fff',fontSize:32,fontWeight:'900',letterSpacing:2,marginTop:20}, splashSub:{color:'#2F80ED',fontSize:20,fontWeight:'700',letterSpacing:8,marginTop:2},
  countdownBox:{marginTop:36,alignItems:'center',backgroundColor:'#0A162C',paddingHorizontal:40,paddingVertical:20,borderRadius:24,borderWidth:1,borderColor:'#1A2F5A',minWidth:140}, countdownNum:{color:'#fff',fontSize:64,fontWeight:'900'}, countdownLabel:{color:'#5A7AAA',fontSize:11,marginTop:6,letterSpacing:2,fontWeight:'700'},
  progressTrack:{width:200,height:4,backgroundColor:'#0A162C',borderRadius:2,marginTop:24,overflow:'hidden',borderWidth:1,borderColor:'#1A2F5A'}, progressFill:{height:4,backgroundColor:'#2F80ED',borderRadius:2},
  splashFooter:{color:'#2A3F5E',fontSize:9,marginTop:30,letterSpacing:1},
  bg:{flex:1,backgroundColor:'#050A18'}, glow1:{position:'absolute',top:-100,left:-100,width:300,height:300,backgroundColor:'#2F80ED',opacity:0.15,borderRadius:150}, glow2:{position:'absolute',bottom:-80,right:-80,width:250,height:250,backgroundColor:'#00FF88',opacity:0.08,borderRadius:125},
  centeredWrapper:{flex:1,justifyContent:'center',alignItems:'center',padding:20}, centerCard:{width:'100%',maxWidth:400,backgroundColor:'#0E1E3D',borderRadius:24,padding:20,borderWidth:1,borderColor:'#1A2F5A',shadowColor:'#000',shadowOpacity:0.3,shadowRadius:20,shadowOffset:{width:0,height:10},alignSelf:'center'}, centerCardWide:{width:'100%',maxWidth:440,alignSelf:'center'},
  scrollCenter:{flexGrow:1,justifyContent:'center',alignItems:'center',padding:20,paddingTop:10}, centerContent:{alignItems:'center',justifyContent:'center',width:'100%'},
  rocketBox:{width:120,height:120,borderRadius:32,backgroundColor:'#0E1E3D',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#2F80ED',shadowColor:'#2F80ED',shadowOpacity:0.4,shadowRadius:15}, rocketGlow:{width:80,height:80,borderRadius:20,backgroundColor:'#1A2F5A',alignItems:'center',justifyContent:'center'}, rocket:{fontSize:44},
  h1:{color:'#fff',fontSize:30,fontWeight:'900',letterSpacing:1,textAlign:'center',marginTop:20}, h1Bot:{color:'#2F80ED',fontSize:18,fontWeight:'600',letterSpacing:6,marginTop:2,textAlign:'center'}, badgeRow:{flexDirection:'row',alignItems:'center',backgroundColor:'#0F1E38',paddingHorizontal:12,paddingVertical:6,borderRadius:20,marginTop:12,borderWidth:1,borderColor:'#1E3A66'}, liveDot:{width:8,height:8,borderRadius:4,backgroundColor:'#00FF88',marginRight:6}, liveText:{color:'#00FF88',fontSize:10,fontWeight:'800',letterSpacing:1},
  sub:{color:'#6B8BB8',fontSize:13,textAlign:'center',marginTop:14,lineHeight:20}, bigBtn:{backgroundColor:'#2F80ED',padding:18,borderRadius:16,alignItems:'center',marginTop:20,width:'100%',overflow:'hidden',shadowColor:'#2F80ED',shadowOpacity:0.3,shadowRadius:10}, bigBtnSmall:{backgroundColor:'#1A2F5A',padding:14,borderRadius:12,alignItems:'center',marginTop:8,borderWidth:1,borderColor:'#2F80ED'}, btnGlow:{position:'absolute',top:0,left:0,right:0,height:1,backgroundColor:'rgba(255,255,255,0.3)'}, bigBt:{color:'#fff',fontWeight:'900',fontSize:15,textAlign:'center'},
  statsMini:{flexDirection:'row',gap:10,marginTop:24,justifyContent:'center'}, miniCard:{backgroundColor:'#0F1E38',paddingHorizontal:16,paddingVertical:10,borderRadius:12,alignItems:'center',borderWidth:1,borderColor:'#1E3A66',minWidth:70}, miniV:{color:'#fff',fontWeight:'900',fontSize:14}, miniL:{color:'#5A7AAA',fontSize:9,marginTop:2,fontWeight:'700'},
  ver:{color:'#2A3F5E',fontSize:10,marginTop:24,textAlign:'center',letterSpacing:1}, hiddenAdmin:{color:'#1A2F5A',marginTop:20,fontSize:11,fontWeight:'700',textAlign:'center'},
  topBack:{flexDirection:'row',padding:15,paddingTop:50}, backBtn:{backgroundColor:'#0F1E38',paddingHorizontal:14,paddingVertical:8,borderRadius:12,borderWidth:1,borderColor:'#1E3A66'}, back:{color:'#2F80ED',fontSize:13,fontWeight:'800'},
  title:{color:'#fff',fontSize:22,fontWeight:'900',textAlign:'center',marginBottom:6}, desc:{color:'#5A7AAA',fontSize:12,textAlign:'center',marginBottom:16,lineHeight:18},
  iconBox:{width:80,height:80,borderRadius:20,backgroundColor:'#0E1E3D',alignSelf:'center',alignItems:'center',justifyContent:'center',marginVertical:16,borderWidth:1,borderColor:'#2F80ED',overflow:'hidden'}, iconGlow:{position:'absolute',bottom:0,left:0,right:0,height:30,backgroundColor:'#2F80ED',opacity:0.1}, icon:{fontSize:34},
  inputWrap:{backgroundColor:'#0A162C',borderRadius:16,borderWidth:1,borderColor:'#1E3A66',padding:2,marginBottom:10}, input:{backgroundColor:'transparent',color:'#fff',padding:16,fontSize:14,fontWeight:'600',textAlign:'center'}, inputDark:{backgroundColor:'#0A162C',borderWidth:1,borderColor:'#1E3A66',color:'#fff',padding:16,borderRadius:12,marginBottom:8,fontSize:13,textAlign:'center'},
  successBox:{backgroundColor:'#0A2A1A',borderWidth:1,borderColor:'#00FF88',padding:12,borderRadius:12,marginBottom:10,alignItems:'center'}, auth:{color:'#00FF88',fontWeight:'800',fontSize:12},
  outlineBtn:{borderWidth:1.5,borderColor:'#1E3A66',padding:16,borderRadius:14,alignItems:'center',marginTop:12,backgroundColor:'#0A162C',width:'100%'}, outlineT:{color:'#6B8BB8',fontWeight:'800',fontSize:13,textAlign:'center'},
  cardPremium:{backgroundColor:'#0E1E3D',borderRadius:20,padding:16,marginBottom:14,borderWidth:1,borderColor:'#1A2F5A',width:'100%'}, cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}, cardTitle:{color:'#fff',fontSize:13,fontWeight:'800'},
  activeBadge:{backgroundColor:'#0A2A1A',borderWidth:1,borderColor:'#00FF88',paddingHorizontal:8,paddingVertical:3,borderRadius:8}, activeBadgeT:{color:'#00FF88',fontSize:8,fontWeight:'900'}, percentBadge:{backgroundColor:'#2F80ED',paddingHorizontal:12,paddingVertical:5,borderRadius:10}, percentT:{color:'#fff',fontWeight:'900',fontSize:12},
  sliderContainer:{marginVertical:10}, sliderArea:{height:50,justifyContent:'center',alignSelf:'center'}, sliderTrack:{height:12,borderRadius:6,justifyContent:'center',position:'relative'}, sliderTrackBg:{position:'absolute',left:0,right:0,height:12,backgroundColor:'#050A18',borderRadius:6,borderWidth:1,borderColor:'#1A2F5A'}, sliderFill:{position:'absolute',left:0,height:12,backgroundColor:'#2F80ED',borderRadius:6,shadowColor:'#2F80ED',shadowOpacity:0.6,shadowRadius:8}, sliderThumbOuter:{position:'absolute',top: -6,marginLeft:-18,width:36,height:36,justifyContent:'center',alignItems:'center'}, sliderThumb:{width:28,height:28,borderRadius:14,backgroundColor:'#fff',borderWidth:4,borderColor:'#2F80ED',justifyContent:'center',alignItems:'center',shadowColor:'#2F80ED',shadowOpacity:0.8,shadowRadius:10,shadowOffset:{width:0,height:0}}, sliderThumbInner:{width:8,height:8,borderRadius:4,backgroundColor:'#2F80ED'},
  sliderLabels:{flexDirection:'row',justifyContent:'space-between',marginTop:6,paddingHorizontal:4}, sliderLabel:{color:'#4A5A7A',fontSize:10,fontWeight:'700'}, sliderLabelMid:{color:'#6B8BB8',fontSize:10,fontWeight:'800'},
  chipRow:{flexDirection:'row',gap:8,marginTop:12,justifyContent:'center'}, miniChip:{backgroundColor:'#0A162C',paddingHorizontal:14,paddingVertical:8,borderRadius:12,borderWidth:1,borderColor:'#1E3A66'}, miniChipOn:{backgroundColor:'#2F80ED',borderColor:'#2F80ED'}, miniChipT:{color:'#6B8BB8',fontSize:11,fontWeight:'800'},
  sepBoxPremium:{backgroundColor:'#050A18',padding:12,borderRadius:12,marginBottom:6,borderWidth:1,borderColor:'#1A2F5A',flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, sepL:{color:'#4A5A7A',fontSize:8,fontWeight:'900',letterSpacing:1}, sepV:{color:'#fff',fontSize:12,fontWeight:'700',marginTop:3,flex:1,textAlign:'center'},
  userCardPremium:{backgroundColor:'#050A18',padding:10,borderRadius:14,marginBottom:10,borderWidth:1,borderColor:'#1A2F5A'}, row:{flexDirection:'row'}, rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  licenseRowPremium:{flexDirection:'row',alignItems:'center',backgroundColor:'#050A18',padding:12,borderRadius:12,marginBottom:8,borderWidth:1,borderColor:'#1A2F5A'}, serialBadge:{backgroundColor:'#2F80ED',paddingHorizontal:8,paddingVertical:4,borderRadius:8,marginRight:10}, serialT:{color:'#fff',fontSize:10,fontWeight:'900'}, copyBtn:{backgroundColor:'#0F1E38',borderWidth:1,borderColor:'#2F80ED',paddingHorizontal:12,paddingVertical:6,borderRadius:8,marginLeft:8}, copyBtnT:{color:'#2F80ED',fontSize:10,fontWeight:'900'},
  idBadge:{flexDirection:'row',backgroundColor:'#0A2A1A',borderWidth:1,borderColor:'#00FF88',padding:10,borderRadius:12,marginBottom:12,alignItems:'center',justifyContent:'center',gap:6}, idBadgeT:{color:'#00FF88',fontSize:11,fontWeight:'800'}, genBtn:{backgroundColor:'#2F80ED',paddingHorizontal:12,paddingVertical:6,borderRadius:8}, genBtnT:{color:'#fff',fontSize:11,fontWeight:'800'},
  logT:{color:'#5A7AAA',fontSize:9,marginBottom:4,fontFamily:'monospace',textAlign:'center'}, smallDesc:{color:'#4A5A7A',fontSize:10,marginTop:8,lineHeight:14,textAlign:'center'}, error:{color:'#FF3A5A',fontSize:11,marginTop:6,fontWeight:'700',textAlign:'center'}, infoT:{color:'#4A5A7A',fontSize:11,textAlign:'center',lineHeight:18}, lineV:{color:'#fff',fontSize:12,fontWeight:'700',flex:1,textAlign:'center'}, activeDot:{fontWeight:'900',fontSize:13,textAlign:'center'}, masterPill:{backgroundColor:'#1A2F5A',color:'#2F80ED',paddingHorizontal:10,paddingVertical:4,borderRadius:8,fontSize:10,fontWeight:'800'},
  bottomNav:{flexDirection:'row',backgroundColor:'#0A162C',borderTopWidth:1,borderTopColor:'#1A2F5A',paddingVertical:8,paddingHorizontal:10,position:'absolute',bottom:0,left:0,right:0,justifyContent:'space-around'}, navItem:{alignItems:'center',flex:1,paddingVertical:4}, navIcon:{fontSize:18}, navText:{fontSize:9,color:'#4A5A7A',marginTop:2,fontWeight:'700'}, navActive:{color:'#2F80ED'},
  statBig:{flex:1,backgroundColor:'#050A18',padding:12,borderRadius:12,alignItems:'center',borderWidth:1,borderColor:'#1A2F5A'}, statBigV:{color:'#fff',fontWeight:'900',fontSize:16}, statBigL:{color:'#4A5A7A',fontSize:9,marginTop:4,fontWeight:'700'},
  actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:8,justifyContent:'center'}, actionBtn:{width:'47%',backgroundColor:'#050A18',padding:16,borderRadius:14,alignItems:'center',borderWidth:1,borderColor:'#1A2F5A'}, actionIcon:{fontSize:22}, actionT:{color:'#8AA0C0',fontSize:11,fontWeight:'700',marginTop:6,textAlign:'center'},
  tradeRow:{flexDirection:'row',alignItems:'center',backgroundColor:'#050A18',padding:12,borderRadius:12,marginBottom:8,borderWidth:1,borderColor:'#1A2F5A',justifyContent:'space-between'}, tradeLeft:{flex:1}, tradeAsset:{color:'#fff',fontWeight:'800',fontSize:12}, tradeTime:{color:'#4A5A7A',fontSize:9,marginTop:2}, tradeDirBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:8,borderWidth:1,marginHorizontal:8}, tradeDirT:{fontSize:10,fontWeight:'900'}, tradeAmt:{color:'#fff',fontWeight:'800',fontSize:12},
  emptyBox:{alignItems:'center',padding:20}, emptyIcon:{fontSize:30,marginBottom:8}, copySmall:{backgroundColor:'#0F1E38',borderWidth:1,borderColor:'#2F80ED',paddingHorizontal:10,paddingVertical:4,borderRadius:6}, copySmallT:{color:'#2F80ED',fontSize:9,fontWeight:'900'}, tipBox:{flexDirection:'row',backgroundColor:'#0A162C',padding:12,borderRadius:12,marginTop:8,borderWidth:1,borderColor:'#1A2F5A',gap:8}, tipIcon:{fontSize:14}, tipT:{color:'#6B8BB8',fontSize:11,flex:1,lineHeight:16,textAlign:'center'},
  ssidSteps:{backgroundColor:'#050A18',padding:12,borderRadius:12,marginTop:12,borderWidth:1,borderColor:'#1A2F5A'}, ssidStepsTitle:{color:'#2F80ED',fontSize:12,fontWeight:'800',marginBottom:8,textAlign:'center'}, ssidStep:{color:'#8AA0C0',fontSize:11,lineHeight:18,marginBottom:4}
});