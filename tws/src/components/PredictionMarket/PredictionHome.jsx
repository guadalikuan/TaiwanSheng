import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSSE } from '../../contexts/SSEContext';
import { TWSCoin_MINT } from '../../utils/twscoin';
import { getTWSCoinBalanceAPI } from '../../utils/api';
import { Home, Check, X, AlertTriangle, Smartphone, Globe, Clock } from 'lucide-react';

// House Wallet for Predictions (Receives bets)
const HOUSE_WALLET_PUBKEY = new PublicKey('JBuwuVzAFDZWVW4o63PtYfLvPGHbSNnRMv5hPzcstyK6'); // TWS Treasury Address

window.Buffer = window.Buffer || Buffer;

export const PREDICTION_MARKETS = [
  { 
    "id": 1, 
    "category": "Livelihood", 
    "question": "明日 12:00-14:00，桃园/新竹地区是否会发生突发性跳电？", 
    "poolYes": 150000, 
    "poolNo": 300000, 
    "onlineTime": "2025-05-18T10:00:00",
    "startTime": "2025-05-19T00:00:00",
    "endTime": "2025-05-21T12:00:00", 
    "drawTime": "2025-05-21T14:30:00",
    "image": "https://www.taipower.com.tw/upload/244/2021051714242666542.jpg" 
  },
  { 
    "id": 2, 
    "category": "Livelihood", 
    "question": "台北全联超市明日 18:00 前，普通白蛋是否会售罄？", 
    "poolYes": 80000, 
    "poolNo": 120000, 
    "onlineTime": "2025-05-18T10:00:00",
    "startTime": "2025-05-19T00:00:00",
    "endTime": "2025-05-21T18:00:00", 
    "drawTime": "2025-05-21T18:30:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Chicken_egg_2009-06-04.jpg/1200px-Chicken_egg_2009-06-04.jpg" 
  },
  { 
    "id": 3, 
    "category": "Livelihood", 
    "question": "明日台积电（2330）外资是净买入还是净卖出？", 
    "poolYes": 5000000, 
    "poolNo": 4200000, 
    "onlineTime": "2025-05-18T09:00:00",
    "startTime": "2025-05-19T09:00:00",
    "endTime": "2025-05-21T13:30:00", 
    "drawTime": "2025-05-21T14:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/TSMC_Logo.svg/1200px-TSMC_Logo.svg.png" 
  },
  { 
    "id": 4, 
    "category": "Livelihood", 
    "question": "未来 24 小时内，花莲海域是否会发生里氏 4.5 级以上地震？", 
    "poolYes": 200000, 
    "poolNo": 800000, 
    "onlineTime": "2025-05-19T00:00:00",
    "startTime": "2025-05-20T00:00:00",
    "endTime": "2025-05-21T23:59:59", 
    "drawTime": "2025-05-22T01:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/2018_Hualien_earthquake_intensity_map.png/600px-2018_Hualien_earthquake_intensity_map.png" 
  },
  { 
    "id": 5, 
    "category": "Livelihood", 
    "question": "明日下午，高雄市中心积水深度是否超过 10 厘米？", 
    "poolYes": 100000, 
    "poolNo": 500000, 
    "onlineTime": "2025-05-19T12:00:00",
    "startTime": "2025-05-20T12:00:00",
    "endTime": "2025-05-21T18:00:00", 
    "drawTime": "2025-05-21T19:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Flooding_in_Kaohsiung.jpg/800px-Flooding_in_Kaohsiung.jpg" 
  },
  { 
    "id": 6, 
    "category": "Livelihood", 
    "question": "本周内，台北捷运文湖线是否会再次发生信号故障停运？", 
    "poolYes": 300000, 
    "poolNo": 400000, 
    "onlineTime": "2025-05-20T08:00:00",
    "startTime": "2025-05-21T06:00:00",
    "endTime": "2025-05-27T23:59:59", 
    "drawTime": "2025-05-28T10:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Taipei_Metro_Wenhu_Line_Bombardier_Innovia_APM_256_train.jpg/800px-Taipei_Metro_Wenhu_Line_Bombardier_Innovia_APM_256_train.jpg" 
  },
  { 
    "id": 7, 
    "category": "Livelihood", 
    "question": "台南市本周新增登革热病例是否超过 100 例？", 
    "poolYes": 50000, 
    "poolNo": 20000, 
    "onlineTime": "2025-05-20T09:00:00",
    "startTime": "2025-05-21T00:00:00",
    "endTime": "2025-05-27T23:59:59", 
    "drawTime": "2025-05-28T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Aedes_aegypti_feeding.jpg/800px-Aedes_aegypti_feeding.jpg" 
  },
  { 
    "id": 8, 
    "category": "Livelihood", 
    "question": "明日台中火力发电厂是否全负荷运转（PM2.5 是否紫爆）？", 
    "poolYes": 600000, 
    "poolNo": 100000, 
    "onlineTime": "2025-05-19T08:00:00",
    "startTime": "2025-05-20T08:00:00",
    "endTime": "2025-05-21T18:00:00", 
    "drawTime": "2025-05-21T20:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Taichung_Power_Plant.jpg/800px-Taichung_Power_Plant.jpg" 
  },
  { 
    "id": 9, 
    "category": "Livelihood", 
    "question": "明日新台币兑美元汇率是否跌破 32.5 大关？", 
    "poolYes": 2000000, 
    "poolNo": 1500000, 
    "onlineTime": "2025-05-19T09:00:00",
    "startTime": "2025-05-20T09:00:00",
    "endTime": "2025-05-21T16:00:00", 
    "drawTime": "2025-05-21T16:30:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/New_Taiwan_Dollar_1000_bill.jpg/800px-New_Taiwan_Dollar_1000_bill.jpg" 
  },
  { 
    "id": 10, 
    "category": "Livelihood", 
    "question": "台湾本月法拍屋数量是否突破 500 户？", 
    "poolYes": 150000, 
    "poolNo": 300000, 
    "onlineTime": "2025-05-01T09:00:00",
    "startTime": "2025-05-01T09:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Real_estate_sold_sign.jpg/800px-Real_estate_sold_sign.jpg" 
  },
  { 
    "id": 11, 
    "category": "Politics", 
    "question": "赖清德明日公开发言中，是否会提及“两岸互不隶属”关键词？", 
    "poolYes": 800000, 
    "poolNo": 200000, 
    "onlineTime": "2025-05-19T08:00:00",
    "startTime": "2025-05-20T08:00:00",
    "endTime": "2025-05-21T20:00:00", 
    "drawTime": "2025-05-21T22:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Lai_Ching-te_Official_Photo_2024.jpg/800px-Lai_Ching-te_Official_Photo_2024.jpg" 
  },
  { 
    "id": 12, 
    "category": "Politics", 
    "question": "下一次立法院会议，是否会发生肢体冲突（推挤/丢水球/勒脖子）？", 
    "poolYes": 900000, 
    "poolNo": 100000, 
    "onlineTime": "2025-05-20T09:00:00",
    "startTime": "2025-05-21T09:00:00",
    "endTime": "2025-05-25T18:00:00", 
    "drawTime": "2025-05-25T20:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Legislative_Yuan_meeting_hall.jpg/800px-Legislative_Yuan_meeting_hall.jpg" 
  },
  { 
    "id": 13, 
    "category": "Politics", 
    "question": "黄国昌委员在明日质询中，分贝是否超过 85 分贝？", 
    "poolYes": 600000, 
    "poolNo": 300000, 
    "onlineTime": "2025-05-19T09:00:00",
    "startTime": "2025-05-20T09:00:00",
    "endTime": "2025-05-21T18:00:00", 
    "drawTime": "2025-05-21T19:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Huang_Kuo-chang_2019.jpg/800px-Huang_Kuo-chang_2019.jpg" 
  },
  { 
    "id": 14, 
    "category": "Politics", 
    "question": "韩国瑜院长本周是否会爆出新的“韩式金句”？", 
    "poolYes": 400000, 
    "poolNo": 500000, 
    "onlineTime": "2025-05-20T10:00:00",
    "startTime": "2025-05-21T00:00:00",
    "endTime": "2025-05-27T23:59:59", 
    "drawTime": "2025-05-28T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Han_Kuo-yu_2019.jpg/800px-Han_Kuo-yu_2019.jpg" 
  },
  { 
    "id": 15, 
    "category": "Politics", 
    "question": "本月内，检调是否会二度搜查柯文哲办公室？", 
    "poolYes": 700000, 
    "poolNo": 600000, 
    "onlineTime": "2025-05-01T09:00:00",
    "startTime": "2025-05-01T09:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Ko_Wen-je_2019.jpg/800px-Ko_Wen-je_2019.jpg" 
  },
  { 
    "id": 16, 
    "category": "Politics", 
    "question": "本月内，是否有民进党立委被爆出婚外情或不雅视频？", 
    "poolYes": 300000, 
    "poolNo": 800000, 
    "onlineTime": "2025-05-01T00:00:00",
    "startTime": "2025-05-01T00:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Democratic_Progressive_Party_flag.svg/800px-Democratic_Progressive_Party_flag.svg.png" 
  },
  { 
    "id": 17, 
    "category": "Politics", 
    "question": "明日 PTT 八卦版，“王义川”相关讨论帖是否超过 50 篇？", 
    "poolYes": 200000, 
    "poolNo": 150000, 
    "onlineTime": "2025-05-20T00:00:00",
    "startTime": "2025-05-20T12:00:00",
    "endTime": "2025-05-21T23:59:59", 
    "drawTime": "2025-05-22T02:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/PTT_Bulletin_Board_System_logo.svg/800px-PTT_Bulletin_Board_System_logo.svg.png" 
  },
  { 
    "id": 18, 
    "category": "Politics", 
    "question": "本周是否会有新的高端疫苗相关弊案录音流出？", 
    "poolYes": 100000, 
    "poolNo": 900000, 
    "onlineTime": "2025-05-20T00:00:00",
    "startTime": "2025-05-21T00:00:00",
    "endTime": "2025-05-27T23:59:59", 
    "drawTime": "2025-05-28T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Medigen_Vaccine_Biologics_logo.svg/800px-Medigen_Vaccine_Biologics_logo.svg.png" 
  },
  { 
    "id": 19, 
    "category": "Politics", 
    "question": "赖清德在今年 520 前，是否会宣布特赦陈水扁？", 
    "poolYes": 50000, 
    "poolNo": 1000000, 
    "onlineTime": "2025-05-01T00:00:00",
    "startTime": "2025-05-01T00:00:00",
    "endTime": "2025-05-20T12:00:00", 
    "drawTime": "2025-05-20T14:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Chen_Shui-bian_2008.jpg/800px-Chen_Shui-bian_2008.jpg" 
  },
  { 
    "id": 20, 
    "category": "Politics", 
    "question": "本月内，是否有国民党地方派系宣布退党？", 
    "poolYes": 150000, 
    "poolNo": 400000, 
    "onlineTime": "2025-05-01T00:00:00",
    "startTime": "2025-05-01T00:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Kuomintang_flag.svg/800px-Kuomintang_flag.svg.png" 
  },
  { 
    "id": 21, 
    "category": "Military", 
    "question": "明日解放军绕台军机总数是否超过 30 架次？", 
    "poolYes": 500000, 
    "poolNo": 200000, 
    "onlineTime": "2025-05-20T08:00:00",
    "startTime": "2025-05-20T18:00:00",
    "endTime": "2025-05-21T18:00:00", 
    "drawTime": "2025-05-21T20:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/J-20_at_Airshow_China_2016.jpg/1200px-J-20_at_Airshow_China_2016.jpg" 
  },
  { 
    "id": 22, 
    "category": "Military", 
    "question": "明日是否会有 5 艘以上解放军军舰跨越所谓“海峡中线”？", 
    "poolYes": 400000, 
    "poolNo": 300000, 
    "onlineTime": "2025-05-20T08:00:00",
    "startTime": "2025-05-20T18:00:00",
    "endTime": "2025-05-21T18:00:00", 
    "drawTime": "2025-05-21T20:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/PLAN_Type_052D_destroyer_Hefei_%28174%29.jpg/800px-PLAN_Type_052D_destroyer_Hefei_%28174%29.jpg" 
  },
  { 
    "id": 23, 
    "category": "Military", 
    "question": "本周内，是否有大陆无人机飞越金门/马祖哨所上空？", 
    "poolYes": 300000, 
    "poolNo": 400000, 
    "onlineTime": "2025-05-20T08:00:00",
    "startTime": "2025-05-21T00:00:00",
    "endTime": "2025-05-27T23:59:59", 
    "drawTime": "2025-05-28T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/BZK-005_UAV.jpg/800px-BZK-005_UAV.jpg" 
  },
  { 
    "id": 24, 
    "category": "Military", 
    "question": "未来 72 小时内，山东舰航母编队是否会通过巴士海峡？", 
    "poolYes": 600000, 
    "poolNo": 500000, 
    "onlineTime": "2025-05-20T12:00:00",
    "startTime": "2025-05-20T12:00:00",
    "endTime": "2025-05-23T12:00:00", 
    "drawTime": "2025-05-23T14:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Shandong_CV-17.jpg/800px-Shandong_CV-17.jpg" 
  },
  { 
    "id": 25, 
    "category": "Military", 
    "question": "东部战区本月是否会发布带有“围岛”字样的宣传视频？", 
    "poolYes": 800000, 
    "poolNo": 100000, 
    "onlineTime": "2025-05-01T08:00:00",
    "startTime": "2025-05-01T08:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/PLA_Eastern_Theater_Command_Emblem.svg/800px-PLA_Eastern_Theater_Command_Emblem.svg.png" 
  },
  { 
    "id": 26, 
    "category": "Military", 
    "question": "若台海演习升级，美军里根号航母是向北航行（日本）还是向南（菲律宾）？", 
    "poolYes": 500000, 
    "poolNo": 500000, 
    "onlineTime": "2025-05-20T10:00:00",
    "startTime": "2025-05-20T12:00:00",
    "endTime": "2025-06-01T12:00:00", 
    "drawTime": "2025-06-01T14:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/USS_Ronald_Reagan_%28CVN-76%29_underway_in_the_Pacific_Ocean_on_12_June_2020.jpg/800px-USS_Ronald_Reagan_%28CVN-76%29_underway_in_the_Pacific_Ocean_on_12_June_2020.jpg" 
  },
  { 
    "id": 27, 
    "category": "Military", 
    "question": "未来 3 个月内，是否会有拉美邦交国宣布与台湾断交？", 
    "poolYes": 200000, 
    "poolNo": 600000, 
    "onlineTime": "2025-05-01T00:00:00",
    "startTime": "2025-05-01T00:00:00",
    "endTime": "2025-08-01T12:00:00", 
    "drawTime": "2025-08-01T16:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Flag_of_the_Republic_of_China.svg/800px-Flag_of_the_Republic_of_China.svg.png" 
  },
  { 
    "id": 28, 
    "category": "Military", 
    "question": "大陆商务部本月是否会宣布中止下一批 ECFA 关税减让产品？", 
    "poolYes": 700000, 
    "poolNo": 300000, 
    "onlineTime": "2025-05-01T09:00:00",
    "startTime": "2025-05-01T09:00:00",
    "endTime": "2025-05-31T17:00:00", 
    "drawTime": "2025-05-31T18:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Ministry_of_Commerce_of_the_PRC_gate.jpg/800px-Ministry_of_Commerce_of_the_PRC_gate.jpg" 
  },
  { 
    "id": 29, 
    "category": "Military", 
    "question": "下一个被大陆海关暂停输入的台湾农产品是：A. 凤梨释迦 B. 午仔鱼 C. 莲雾？", 
    "poolYes": 100000, 
    "poolNo": 100000, 
    "onlineTime": "2025-05-15T09:00:00",
    "startTime": "2025-05-15T09:00:00",
    "endTime": "2025-06-01T12:00:00", 
    "drawTime": "2025-06-01T14:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Wax_apple.jpg/800px-Wax_apple.jpg" 
  },
  { 
    "id": 30, 
    "category": "Military", 
    "question": "本周内，大陆海警是否会在金厦海域再次登检台湾游船？", 
    "poolYes": 400000, 
    "poolNo": 400000, 
    "onlineTime": "2025-05-20T08:00:00",
    "startTime": "2025-05-21T00:00:00",
    "endTime": "2025-05-27T23:59:59", 
    "drawTime": "2025-05-28T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/China_Coast_Guard_Vessel_2901.jpg/800px-China_Coast_Guard_Vessel_2901.jpg" 
  },
  { 
    "id": 31, 
    "category": "International", 
    "question": "特朗普下次演讲，是否会再次提到“台湾偷走了芯片生意”？", 
    "poolYes": 900000, 
    "poolNo": 200000, 
    "onlineTime": "2025-05-18T10:00:00",
    "startTime": "2025-05-19T00:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/800px-Donald_Trump_official_portrait.jpg" 
  },
  { 
    "id": 32, 
    "category": "International", 
    "question": "美国承诺交付的 F-16V 战机，本月是否会宣布再次延期？", 
    "poolYes": 800000, 
    "poolNo": 200000, 
    "onlineTime": "2025-05-01T09:00:00",
    "startTime": "2025-05-01T09:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/F-16_Fighting_Falcon.jpg/800px-F-16_Fighting_Falcon.jpg" 
  },
  { 
    "id": 33, 
    "category": "International", 
    "question": "日本驻台协会是否会在本季度更新“在台日侨紧急撤离指南”？", 
    "poolYes": 300000, 
    "poolNo": 500000, 
    "onlineTime": "2025-04-01T09:00:00",
    "startTime": "2025-04-01T09:00:00",
    "endTime": "2025-06-30T23:59:59", 
    "drawTime": "2025-07-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Flag_of_Japan.svg/800px-Flag_of_Japan.svg.png" 
  },
  { 
    "id": 34, 
    "category": "International", 
    "question": "台积电是否会宣布在德国或美国建立新的 2nm 晶圆厂？", 
    "poolYes": 400000, 
    "poolNo": 600000, 
    "onlineTime": "2025-01-01T09:00:00",
    "startTime": "2025-01-01T09:00:00",
    "endTime": "2025-12-31T23:59:59", 
    "drawTime": "2026-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/TSMC_Logo.svg/1200px-TSMC_Logo.svg.png" 
  },
  { 
    "id": 35, 
    "category": "International", 
    "question": "本年内，是否会有东南亚国家取消对台湾的免签待遇？", 
    "poolYes": 200000, 
    "poolNo": 700000, 
    "onlineTime": "2025-01-01T00:00:00",
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2025-12-31T23:59:59", 
    "drawTime": "2026-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Flag_of_Vietnam.svg/800px-Flag_of_Vietnam.svg.png" 
  },
  { 
    "id": 36, 
    "category": "International", 
    "question": "黄仁勋下周是否会访问中国大陆（上海/北京）？", 
    "poolYes": 500000, 
    "poolNo": 500000, 
    "onlineTime": "2025-05-20T00:00:00",
    "startTime": "2025-05-21T00:00:00",
    "endTime": "2025-05-27T23:59:59", 
    "drawTime": "2025-05-28T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Jensen_Huang_at_Computex_2023.jpg/800px-Jensen_Huang_at_Computex_2023.jpg" 
  },
  { 
    "id": 37, 
    "category": "International", 
    "question": "马斯克本月是否会在 X 上发表关于“台湾是中国一部分”的言论？", 
    "poolYes": 300000, 
    "poolNo": 800000, 
    "onlineTime": "2025-05-01T00:00:00",
    "startTime": "2025-05-01T00:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/800px-Elon_Musk_Royal_Society_%28crop2%29.jpg" 
  },
  { 
    "id": 38, 
    "category": "International", 
    "question": "台湾央行本月黄金储备量是否减少（暗示转移）？", 
    "poolYes": 100000, 
    "poolNo": 900000, 
    "onlineTime": "2025-05-01T09:00:00",
    "startTime": "2025-05-01T09:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Gold_Bullion_Bars.jpg/800px-Gold_Bullion_Bars.jpg" 
  },
  { 
    "id": 39, 
    "category": "International", 
    "question": "台湾百大富豪榜中，本月是否有人变更国籍为新加坡？", 
    "poolYes": 200000, 
    "poolNo": 400000, 
    "onlineTime": "2025-05-01T00:00:00",
    "startTime": "2025-05-01T00:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Flag_of_Singapore.svg/800px-Flag_of_Singapore.svg.png" 
  },
  { 
    "id": 40, 
    "category": "International", 
    "question": "2026 年底前，新台币是否会发行新版（去中国化设计）？", 
    "poolYes": 100000, 
    "poolNo": 800000, 
    "onlineTime": "2025-01-01T00:00:00",
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2026-12-31T23:59:59", 
    "drawTime": "2027-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/New_Taiwan_Dollar_1000_bill.jpg/800px-New_Taiwan_Dollar_1000_bill.jpg" 
  },
  { 
    "id": 41, 
    "category": "Humor", 
    "question": "2028 年 1 月 1 日，台北总统府的产权归属是：A. 中华民国 B. 中华人民共和国 C. TWS 资产管理公司？", 
    "poolYes": 1000, 
    "poolNo": 1000000, 
    "onlineTime": "2025-05-20T00:00:00",
    "startTime": "2025-05-20T00:00:00",
    "endTime": "2028-01-01T00:00:00", 
    "drawTime": "2028-01-02T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Presidential_Office_Building_Taipei.jpg/800px-Presidential_Office_Building_Taipei.jpg" 
  },
  { 
    "id": 42, 
    "category": "Humor", 
    "question": "假如开战，台军能撑过：A. 24小时 B. 72小时 C. 1周？", 
    "poolYes": 500000, 
    "poolNo": 500000, 
    "onlineTime": "2025-01-01T00:00:00",
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2025-12-31T23:59:59", 
    "drawTime": "2026-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/ROCA_soldier_with_T91_assault_rifle.jpg/800px-ROCA_soldier_with_T91_assault_rifle.jpg" 
  },
  { 
    "id": 43, 
    "category": "Humor", 
    "question": "解放军首批登陆点预测：A. 桃园竹围 B. 台北港 C. 宜兰头城？", 
    "poolYes": 300000, 
    "poolNo": 300000, 
    "onlineTime": "2025-01-01T00:00:00",
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2025-12-31T23:59:59", 
    "drawTime": "2026-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Port_of_Taipei.jpg/800px-Port_of_Taipei.jpg" 
  },
  { 
    "id": 44, 
    "category": "Humor", 
    "question": "开战后，AIT（美国在台协会）直升机能带走多少人？ A. <50人 B. 100-500人 C. 仅限处长？", 
    "poolYes": 600000, 
    "poolNo": 200000, 
    "onlineTime": "2025-01-01T00:00:00",
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2025-12-31T23:59:59", 
    "drawTime": "2026-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/AIT_New_Compound.jpg/800px-AIT_New_Compound.jpg" 
  },
  { 
    "id": 45, 
    "category": "Humor", 
    "question": "台北故宫翠玉白菜最终会：A. 留在台北 B. 回到北京 C. 被运往日本？", 
    "poolYes": 200000, 
    "poolNo": 400000, 
    "onlineTime": "2025-01-01T00:00:00",
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2025-12-31T23:59:59", 
    "drawTime": "2026-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Jadeite_Cabbage_with_Insects.jpg/800px-Jadeite_Cabbage_with_Insects.jpg" 
  },
  { 
    "id": 46, 
    "category": "Humor", 
    "question": "台北市防空洞租金本月环比涨幅是否超过 5%？", 
    "poolYes": 50000, 
    "poolNo": 100000, 
    "onlineTime": "2025-05-01T00:00:00",
    "startTime": "2025-05-01T00:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Air_raid_shelter_sign_in_Taipei.jpg/800px-Air_raid_shelter_sign_in_Taipei.jpg" 
  },
  { 
    "id": 47, 
    "category": "Humor", 
    "question": "统一后，康师傅方便面在台湾的售价是：A. 涨价 B. 降价 C. 免费发放？", 
    "poolYes": 100000, 
    "poolNo": 200000, 
    "onlineTime": "2025-01-01T00:00:00",
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2025-12-31T23:59:59", 
    "drawTime": "2026-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Kang_Shi_Fu_Instant_Noodles.jpg/800px-Kang_Shi_Fu_Instant_Noodles.jpg" 
  },
  { 
    "id": 48, 
    "category": "Humor", 
    "question": "您的台胞证号码最后一位是奇数还是偶数？（纯博彩）", 
    "poolYes": 500000, 
    "poolNo": 500000, 
    "onlineTime": "2025-01-01T00:00:00",
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2025-12-31T23:59:59", 
    "drawTime": "2026-01-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Mainland_Travel_Permit_for_Taiwan_Residents_%28sample%29.jpg/800px-Mainland_Travel_Permit_for_Taiwan_Residents_%28sample%29.jpg" 
  },
  { 
    "id": 49, 
    "category": "Humor", 
    "question": "下一批公布的“台独顽固分子”名单中，是否包含名嘴于北辰？", 
    "poolYes": 800000, 
    "poolNo": 100000, 
    "onlineTime": "2025-05-01T00:00:00",
    "startTime": "2025-05-01T00:00:00",
    "endTime": "2025-05-31T23:59:59", 
    "drawTime": "2025-06-01T12:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Yu_Pei-chen.jpg/800px-Yu_Pei-chen.jpg" 
  },
  { 
    "id": 50, 
    "category": "Humor", 
    "question": "本周五收盘，TWS Coin 能否突破 $10 美元？", 
    "poolYes": 10000000, 
    "poolNo": 100000, 
    "onlineTime": "2025-05-18T00:00:00",
    "startTime": "2025-05-19T00:00:00",
    "endTime": "2025-05-24T16:00:00", 
    "drawTime": "2025-05-24T18:00:00",
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Cryptocurrency_Logo.svg/800px-Cryptocurrency_Logo.svg.png" 
  }
];


const PredictionCard = ({ market, position, onClick, currentOdds }) => {
  const isCenter = position === 'center';
  
  // 3D 旋转变体 - 优化交互体验
  const variants = {
    center: { 
      x: 0, 
      scale: 1, 
      opacity: 1, 
      zIndex: 20, 
      rotateY: 0,
      filter: 'brightness(1)',
      transition: { duration: 0.5, ease: "backOut" }
    },
    left: { 
      x: '-85%', 
      scale: 0.85, 
      opacity: 0.7, 
      zIndex: 10, 
      rotateY: 45, // 向右旋转，面向中心
      filter: 'brightness(0.6)',
      transition: { duration: 0.5, ease: "easeInOut" }
    },
    right: { 
      x: '85%', 
      scale: 0.85, 
      opacity: 0.7, 
      zIndex: 10, 
      rotateY: -45, // 向左旋转，面向中心
      filter: 'brightness(0.6)',
      transition: { duration: 0.5, ease: "easeInOut" }
    },
    hiddenLeft: { 
      x: '-150%', 
      scale: 0.6, 
      opacity: 0, 
      zIndex: 0,
      rotateY: 90 
    },
    hiddenRight: { 
      x: '150%', 
      scale: 0.6, 
      opacity: 0, 
      zIndex: 0,
      rotateY: -90
    }
  };

  return (
    <motion.div
      layoutId={position === 'center' ? `card-${market.id}` : undefined} // 仅中心卡片启用 layoutId 以避免旋转冲突
      initial={false}
      animate={position}
      variants={variants}
      onClick={onClick}
      className={`absolute top-0 w-full max-w-md h-[500px] bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-2xl flex flex-col ${isCenter ? 'cursor-default' : 'cursor-pointer hover:border-gray-500'}`}
      style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
    >
      {/* 图片背景 */}
      <div className="h-3/5 w-full bg-cover bg-center relative group" style={{ backgroundImage: `url(${market.image})` }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900"></div>
        
        {/* 类别标签 */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-bold border border-white/20 uppercase">
          {market.category}
        </div>

        {/* 胜率仪表盘 (中心悬浮) - Only visible on center */}
        {isCenter && (
          <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-20 w-full justify-center px-4">
              {/* NO ODDS */}
              <div className="bg-red-900/90 backdrop-blur border border-red-500 p-2 rounded w-20 text-center shadow-lg">
                <div className="text-[10px] text-red-300">NO PAYOUT</div>
                <div className="text-xl font-black text-white">{currentOdds.no}x</div>
              </div>

              {/* VS Badge */}
              <div className="w-16 h-16 bg-gray-800 rounded-full border-4 border-yellow-500 flex items-center justify-center shadow-xl z-30">
                <span className="font-black text-yellow-500 text-xl italic">VS</span>
              </div>

              {/* YES ODDS */}
              <div className="bg-green-900/90 backdrop-blur border border-green-500 p-2 rounded w-20 text-center shadow-lg">
                <div className="text-[10px] text-green-300">YES PAYOUT</div>
                <div className="text-xl font-black text-white">{currentOdds.yes}x</div>
              </div>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 pt-14 px-6 pb-6 flex flex-col justify-between bg-gray-900">
        <div>
          <h2 className="text-xl font-bold leading-tight mb-3 line-clamp-3 text-white">
            {market.question}
          </h2>
          
          {/* 进度条 */}
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500" style={{ width: `${(market.poolYes / (market.poolYes + market.poolNo)) * 100}%` }}></div>
            <div className="h-full bg-red-500" style={{ width: `${(market.poolNo / (market.poolYes + market.poolNo)) * 100}%` }}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>YES: ${(market.poolYes/1000).toFixed(1)}k</span>
            <span>NO: ${(market.poolNo/1000).toFixed(1)}k</span>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-gray-500 mt-3 border-t border-gray-800 pt-2 font-mono">
             <div className="flex justify-between"><span>上线:</span> <span className="text-gray-400">{new Date(market.onlineTime).getMonth()+1}/{new Date(market.onlineTime).getDate()} {new Date(market.onlineTime).getHours()}:{String(new Date(market.onlineTime).getMinutes()).padStart(2,'0')}</span></div>
             <div className="flex justify-between"><span>开始:</span> <span className="text-gray-400">{new Date(market.startTime).getMonth()+1}/{new Date(market.startTime).getDate()} {new Date(market.startTime).getHours()}:{String(new Date(market.startTime).getMinutes()).padStart(2,'0')}</span></div>
             <div className="flex justify-between"><span>截止:</span> <span className="text-yellow-500/80">{new Date(market.endTime).getMonth()+1}/{new Date(market.endTime).getDate()} {new Date(market.endTime).getHours()}:{String(new Date(market.endTime).getMinutes()).padStart(2,'0')}</span></div>
             <div className="flex justify-between"><span>开奖:</span> <span className="text-gray-400">{new Date(market.drawTime).getMonth()+1}/{new Date(market.drawTime).getDate()} {new Date(market.drawTime).getHours()}:{String(new Date(market.drawTime).getMinutes()).padStart(2,'0')}</span></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SkeletonCard = ({ position }) => {
  const variants = {
    center: { x: 0, scale: 1, opacity: 1, zIndex: 20 },
    left: { x: '-85%', scale: 0.85, opacity: 0.5, zIndex: 10, rotateY: 45 },
    right: { x: '85%', scale: 0.85, opacity: 0.5, zIndex: 10, rotateY: -45 },
  };

  return (
    <motion.div
      initial={position}
      animate={position}
      variants={variants}
      className="absolute top-0 w-full max-w-md h-[500px] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl flex flex-col animate-pulse"
      style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
    >
      <div className="h-3/5 bg-gray-700 w-full" />
      <div className="flex-1 p-6 space-y-4">
        <div className="h-6 bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-700 rounded w-1/2" />
        <div className="h-2 bg-gray-700 rounded-full w-full mt-4" />
      </div>
    </motion.div>
  );
};

// Custom Connect Modal Component
const ConnectWalletModal = ({ isOpen, onClose, onSelectType }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        <h3 className="text-xl font-bold text-white mb-6 text-center">连接钱包</h3>
        <div className="space-y-4">
          <button
            onClick={() => onSelectType('extension')}
            className="w-full flex items-center p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition border border-gray-700 hover:border-blue-500 group"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mr-4 group-hover:bg-blue-500 group-hover:text-white transition">
              <Globe size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-white">浏览器插件钱包</div>
              <div className="text-xs text-gray-400">Phantom, Solflare, Backpack (推荐)</div>
            </div>
          </button>
          
          <button
            onClick={() => onSelectType('software')}
            className="w-full flex items-center p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition border border-gray-700 hover:border-purple-500 group"
          >
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 mr-4 group-hover:bg-purple-500 group-hover:text-white transition">
               <Smartphone size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-white">移动端/软件钱包</div>
              <div className="text-xs text-gray-400">WalletConnect, Mobile Apps</div>
            </div>
          </button>
        </div>
        <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
                支持多种钱包连接方式，保障资金安全
            </p>
        </div>
      </div>
    </div>
  );
};

const PredictionHome = () => {
  const { isAuthenticated, user, loginWithWallet, logout } = useAuth();
  const { subscribe } = useSSE();
  
  // Wallet Adapter Hooks
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [showConnectTypeModal, setShowConnectTypeModal] = useState(false);
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0); // TWSCoin Balance
  const [manualAddress, setManualAddress] = useState(null); // From Auction-style connection
  
  // Display State
  const [markets, setMarkets] = useState(PREDICTION_MARKETS.slice(0, 5));
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Loading & Pagination State
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(PREDICTION_MARKETS.length > 5);
  const [loadError, setLoadError] = useState(false);
  const [allMarkets, setAllMarkets] = useState(PREDICTION_MARKETS);
  
  // Initial Load - Fetch from Server
  useEffect(() => {
    const fetchMarkets = async () => {
        try {
            const res = await fetch('/api/prediction/markets');
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                 setAllMarkets(data.data);
                 setMarkets(data.data.slice(0, 5));
                 setHasMore(data.data.length > 5);
            } else {
                 // Fallback to static if empty
                 setAllMarkets(PREDICTION_MARKETS);
                 setMarkets(PREDICTION_MARKETS.slice(0, 5));
                 setHasMore(PREDICTION_MARKETS.length > 5);
            }
        } catch (e) {
            console.error("Failed to fetch markets", e);
            setAllMarkets(PREDICTION_MARKETS);
            setMarkets(PREDICTION_MARKETS.slice(0, 5));
            setHasMore(PREDICTION_MARKETS.length > 5);
        }
        setIsLoading(false);
    };
    fetchMarkets();
  }, []);

  // Wallet Connection Listener (Auction Style)
  useEffect(() => {
    const handleWalletConnected = (event) => {
      const { address } = event.detail;
      setManualAddress(address);
    };
    window.addEventListener('walletConnected', handleWalletConnected);
    const storedWallet = localStorage.getItem('solana_wallet_address');
    if (storedWallet) {
      setManualAddress(storedWallet);
    }
    return () => window.removeEventListener('walletConnected', handleWalletConnected);
  }, []);

  // Async Load More
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setLoadError(false);
    
    try {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setMarkets(prev => {
        const currentLen = prev.length;
        const nextBatch = allMarkets.slice(currentLen, currentLen + 5);
        
        if (currentLen + nextBatch.length >= allMarkets.length) {
          setHasMore(false);
        }
        
        return [...prev, ...nextBatch];
      });
    } catch (e) {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, allMarkets]);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (!isLoading && hasMore && activeIndex >= markets.length - 2) {
      loadMore();
    }
  }, [activeIndex, markets.length, hasMore, isLoading, loadMore]);

  const [adminMode, setAdminMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMarket, setEditingMarket] = useState(null);
  
  // Initialize with default times
  const defaultTimeSettings = () => {
      const now = new Date();
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
      return {
          onlineTime: now.toISOString().slice(0, 16),
          startTime: now.toISOString().slice(0, 16),
          endTime: tomorrow.toISOString().slice(0, 16),
          drawTime: nextWeek.toISOString().slice(0, 16)
      };
  };

  const [newMarketForm, setNewMarketForm] = useState({
    question: '',
    image: '',
    category: 'General',
    poolYes: 10000,
    poolNo: 10000,
    ...defaultTimeSettings()
  });

  // Confirmation Modal State
  const [confirmBet, setConfirmBet] = useState(null); // { marketId, direction, amount }

  const location = useLocation();
  
  // 弹幕数据
  const [barrage, setBarrage] = useState([]);

  // 检查管理员权限
  const isAdmin = useMemo(() => {
    return user?.username === 'admin' && user?.role === 'ADMIN';
  }, [user]);

  // 真实下注数据监听 (SSE)
  useEffect(() => {
    const unsubscribe = subscribe('prediction', (message) => {
      if (message.data && message.data.type === 'bet') {
        setBarrage(prev => {
          const newBarrage = [...prev, message.data.bet];
          if (newBarrage.length > 5) newBarrage.shift();
          return newBarrage;
        });
      }
    });
    return unsubscribe;
  }, [subscribe]);

  // 监听路由参数，定位到指定卡片
  useEffect(() => {
    if (location.state?.startMarketId && allMarkets.length > 0) {
      const idx = allMarkets.findIndex(m => m.id === location.state.startMarketId);
      if (idx !== -1) setActiveIndex(idx);
    }
  }, [location.state, allMarkets]);

  // Sync Wallet State
  useEffect(() => {
    const address = (connected && publicKey) ? publicKey.toString() : manualAddress;
    
    if (address) {
      if (!isAuthenticated && connected && publicKey) {
          loginWithWallet(address);
      }
      fetchBalance(address);
    } else {
      setBalance(0);
    }
  }, [connected, publicKey, isAuthenticated, manualAddress]);

  // 格式化 TWSCoin 余额（6 decimals）
  const formatBalance = (rawBalance) => {
    if (!rawBalance) return 0;
    return Number(rawBalance) / Math.pow(10, 6);
  };

  const fetchBalance = async (publicKeyStr) => {
    if (!publicKeyStr) return;
    
    const startTime = Date.now();
    console.log(`[Balance_Debug] Starting balance check for ${publicKeyStr} at ${new Date(startTime).toISOString()}`);
    
    let finalBalanceRaw = 0;
    let source = 'none';

    // 1. Try API first (Server-side check)
    try {
        console.log(`[Balance_Debug] Calling API: getTWSCoinBalanceAPI...`);
        const res = await getTWSCoinBalanceAPI(publicKeyStr);
        console.log(`[Balance_Debug] API Response:`, res);

        if (res.success) {
            const apiRawVal = Number(res.data.balance);
            console.log(`[Balance_Debug] API Raw Balance: ${apiRawVal} (Formatted: ${formatBalance(apiRawVal)})`);
            
            if (!isNaN(apiRawVal) && apiRawVal > 0) {
                finalBalanceRaw = apiRawVal;
                source = 'API';
            }
        }
    } catch (e) {
        console.error("[Balance_Debug] API Balance check failed", e);
    }

    // 2. Fallback to RPC (Double check if API is 0 or failed)
    if (finalBalanceRaw === 0) {
        try {
          const publicKey = new PublicKey(publicKeyStr);
          const mint = new PublicKey(TWSCoin_MINT);
          
          console.log(`[Balance_Debug] Fetching from RPC for ${publicKeyStr} (Mint: ${TWSCoin_MINT})...`);
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { 
            mint: mint 
          });
          
          console.log(`[Balance_Debug] RPC Token Accounts found: ${tokenAccounts.value.length}`);

          if (tokenAccounts.value.length > 0) {
            const balanceInfo = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
            console.log(`[Balance_Debug] RPC Balance Info:`, balanceInfo);
            
            // RPC returns 'amount' (string raw) and 'uiAmount' (number formatted)
            // We want Raw to be consistent with API logic, OR we just trust uiAmount.
            // Let's use uiAmount for display/logic if we switch to Formatted Units.
            // But to keep 'finalBalanceRaw' consistent as RAW units:
            const rpcRawVal = Number(balanceInfo.amount); 
            console.log(`[Balance_Debug] RPC Raw Balance: ${rpcRawVal}`);

            if (rpcRawVal > 0) {
                finalBalanceRaw = rpcRawVal;
                source = 'RPC';
            }
          } else {
            console.log(`[Balance_Debug] No token accounts found via RPC`);
          }
        } catch (e) {
          if (e.message && e.message.includes("could not find mint")) {
             console.warn("[Balance_Debug] TWSCoin mint not found on Devnet.");
          } else {
             console.error("[Balance_Debug] Failed to fetch balance via RPC:", e);
          }
        }
    }

    // Convert to Formatted TWS for State and Logic
    const finalBalanceFormatted = formatBalance(finalBalanceRaw);
    
    console.log(`[Balance_Debug] === FINAL RESULT ===`);
    console.log(`[Balance_Debug] Address: ${publicKeyStr}`);
    console.log(`[Balance_Debug] Source: ${source}`);
    console.log(`[Balance_Debug] Raw: ${finalBalanceRaw}`);
    console.log(`[Balance_Debug] Formatted (State): ${finalBalanceFormatted}`);
    console.log(`[Balance_Debug] Time taken: ${Date.now() - startTime}ms`);

    setBalance(finalBalanceFormatted);
  };

  const handleConnectClick = () => {
    setShowConnectTypeModal(true);
  };

  const handleSelectWalletType = (type) => {
    setShowConnectTypeModal(false);
    setVisible(true);
  };

  const initiateBet = (direction) => {
    const address = (connected && publicKey) ? publicKey.toString() : manualAddress;
    
    if (!address) {
      handleConnectClick();
      return;
    }
    
    const market = markets[activeIndex];
    
    // Check timing (simplified check)
    const now = new Date();
    if (market.startTime && new Date(market.startTime) > now) {
      alert("Betting has not started yet!");
      return;
    }
    if (market.endTime && new Date(market.endTime) < now) {
      alert("Betting has ended!");
      return;
    }

    const betAmount = 100; // Fixed bet amount

    // Open Confirmation Modal
    setConfirmBet({
      marketId: market.id,
      marketQuestion: market.question,
      direction,
      amount: betAmount
    });
  };

  const executeBet = async () => {
    if (!confirmBet) return;

    // Require Wallet Adapter for signing
    if (!connected || !publicKey) {
      alert("Please connect your wallet to sign the transaction.");
      handleConnectClick();
      return;
    }

    const { marketId, direction, amount } = confirmBet;
    setConfirmBet(null); // Close modal

    if (balance < amount) {
      alert(`余额不足：你需要 ${amount} TWSCoin 才能下注！`);
      return;
    }
    
    try {
      const fromPublicKey = publicKey;
      const toPublicKey = HOUSE_WALLET_PUBKEY;
      const mint = new PublicKey(TWSCoin_MINT);
      
      const sourceTokenAccount = await splToken.getAssociatedTokenAddress(mint, fromPublicKey);
      const destTokenAccount = await splToken.getAssociatedTokenAddress(mint, toPublicKey);

      const transaction = new Transaction();
      // 2. Transfer tokens
      // Amount is already in TWS units (e.g. 100), need to convert to Raw for transfer
      const amountRaw = BigInt(Math.round(amount * Math.pow(10, 6)));

      transaction.add(
          splToken.createTransferInstruction(
              sourceTokenAccount,
              destTokenAccount,
              fromPublicKey,
              amountRaw,
              [],
              splToken.TOKEN_PROGRAM_ID
          )
      );
      
      transaction.feePayer = fromPublicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      
      const signature = await sendTransaction(transaction, connection);
      
      console.log(`Transaction sent: ${signature}`);
      
      // Update local state (Optimistic UI)
      // In a real app, backend would update pools. Here we just move on.
      console.log(`User voted ${direction} on market ${marketId}`);

      // Save to localStorage for History Demo
      try {
        const historyItem = {
          walletAddress: publicKey.toString(),
          marketId,
          direction,
          amount,
          signature,
          timestamp: new Date().toISOString()
        };
        const currentHistory = JSON.parse(localStorage.getItem('tws_betting_history') || '[]');
        localStorage.setItem('tws_betting_history', JSON.stringify([historyItem, ...currentHistory]));
      } catch (e) {
        console.error("Failed to save history", e);
      }

      // Move to next card
      setActiveIndex(prev => (prev + 1) % markets.length);
      
      // Refresh balance
      setTimeout(() => fetchBalance(publicKey.toString()), 2000);
      
    } catch (err) {
      console.error("Betting failed:", err);
      alert("下注失败: " + (err.message || "未知错误"));
    }
  };

  // Admin functions
  const handleDeleteMarket = async (id) => {
    if (!isAdmin) return;
    if (window.confirm(`[GOD MODE] Delete market #${id}?`)) {
      const updatedMarkets = markets.filter(m => m.id !== id);
      setMarkets(updatedMarkets);
      setActiveIndex(0);
      
      // Sync with Server
      try {
          await fetch('/api/prediction/markets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ markets: updatedMarkets })
          });
      } catch (err) {
          console.error("Failed to sync delete", err);
      }
    }
  };

  const handleSaveMarket = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    let updatedMarkets;
    if (editingMarket) {
        // Edit Mode
        updatedMarkets = markets.map(m => m.id === editingMarket.id ? { ...m, ...newMarketForm } : m);
        alert("Market updated!");
    } else {
        // Create Mode
        const newMarket = {
          id: Date.now(),
          ...newMarketForm
        };
        updatedMarkets = [...markets, newMarket];
        alert("New market added!");
    }
    
    setMarkets(updatedMarkets);
    setShowAddModal(false);
    setEditingMarket(null);
    setNewMarketForm({ question: '', image: '', category: 'General', poolYes: 10000, poolNo: 10000, ...defaultTimeSettings() });

    // Sync with Server
    try {
        await fetch('/api/prediction/markets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markets: updatedMarkets })
        });
    } catch (err) {
        console.error("Failed to sync markets", err);
        alert("Market updated locally but failed to sync to server.");
    }
  };

  const handleEditMarket = (market) => {
      setEditingMarket(market);
      setNewMarketForm({
          question: market.question,
          image: market.image,
          category: market.category,
          poolYes: market.poolYes,
          poolNo: market.poolNo,
          onlineTime: market.onlineTime || defaultTimeSettings().onlineTime,
          startTime: market.startTime || defaultTimeSettings().startTime,
          endTime: market.endTime || defaultTimeSettings().endTime,
          drawTime: market.drawTime || defaultTimeSettings().drawTime
      });
      setShowAddModal(true);
  };

  const handleDistributePrizes = (marketId) => {
      if (!isAdmin) return;
      if (!window.confirm(`[GOD MODE] Distribute prize pool for Market #${marketId}?`)) return;
      
      // Simulation Logic
      console.log(`[Treasury] Starting distribution for Market #${marketId}...`);
      const market = markets.find(m => m.id === marketId);
      const totalPool = market.poolYes + market.poolNo;
      console.log(`[Treasury] Total Pool: ${totalPool} TWS`);
      
      // Simulate retrieving winners from "Contract" or "Database"
      // In this frontend-only demo, we just pretend.
      setTimeout(() => {
          alert(`✅ Prize Distribution Simulated!\n\nMarket: ${market.question}\nTotal Pool: ${totalPool} TWS\n\nWinners have received their airdrops (Console Logged).`);
          console.log(`[Treasury] Distribution Complete.`);
      }, 1000);
  };

  const handleForceResolve = (marketId, outcome) => {
    if (!isAdmin) return;
    const confirm = window.confirm(`[GOD MODE] Force resolve market #${marketId} to ${outcome}?`);
    if (confirm) alert(`Resolved to ${outcome}`);
  };

  // Carousel Logic (Linear)
  const currentMarket = markets[activeIndex];
  const currentOdds = currentMarket ? {
    yes: (currentMarket.poolNo / currentMarket.poolYes + 1).toFixed(2),
    no: (currentMarket.poolYes / currentMarket.poolNo + 1).toFixed(2)
  } : { yes: 1, no: 1 };

  // Calculate visible indices (Linear, no wrapping)
  const indicesToRender = [];
  if (markets.length > 0) {
      // Always try to render: active-2, active-1, active, active+1, active+2
      // Only add valid indices
      for (let i = activeIndex - 2; i <= activeIndex + 2; i++) {
          if (i >= 0 && i < markets.length) {
              indicesToRender.push(i);
          }
      }
  }

  // Handle navigation
  const handlePrev = () => {
      if (activeIndex > 0) setActiveIndex(prev => prev - 1);
  };
  
  const handleNext = () => {
      if (activeIndex < markets.length - 1) setActiveIndex(prev => prev + 1);
      else if (hasMore && !isLoading) loadMore();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center overflow-hidden relative font-sans">
      
      {/* Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0" 
           style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)", backgroundSize: "cover" }}>
      </div>

      {/* Navbar */}
      <div className="w-full max-w-md p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black to-transparent gap-4">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-900/50 border border-gray-700 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <Home size={20} />
        </button>

        <div className="flex flex-col flex-1">
          <h1 className="text-3xl font-black text-red-600 tracking-tighter italic" style={{ textShadow: "0 0 10px rgba(220, 38, 38, 0.5)" }}>
            TWS <span className="text-white">WAR ROOM</span>
          </h1>
          <span className="text-xs text-gray-500 tracking-widest">GEOPOLITICAL CASINO</span>
        </div>
        
        <div className="flex flex-col items-end gap-1">
            <button onClick={connected ? logout : handleConnectClick} className={`px-3 py-1 text-sm rounded-sm font-bold border ${(connected && publicKey) || manualAddress ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-500 animate-pulse'}`}>
            {(connected && publicKey) || manualAddress ? `● ${(publicKey?.toString() || manualAddress).slice(0, 4)}..${(publicKey?.toString() || manualAddress).slice(-4)}` : "[ CONNECT ]"}
            </button>
            {(connected && publicKey) && (
                <span className="text-xs font-mono text-green-400 bg-black/50 px-1 rounded border border-green-900/30">
                    BAL: {balance} TWS
                </span>
            )}
        </div>
      </div>

      {/* Barrage */}
      <div className="w-full max-w-md h-24 overflow-hidden relative z-0 pointer-events-none">
        <AnimatePresence>
          {barrage.map((msg, i) => (
            <motion.div key={msg.id} initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} className="absolute w-full text-xs text-green-400/70 px-4 py-1 font-mono" style={{ top: `${(i % 3) * 20}px` }}>
              {`> ${msg.text}`}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* History Button - Centered and Prominent (Moved Up) */}
      <div className="w-full max-w-md flex justify-center -mt-20 z-20 relative pointer-events-auto">
        <button 
          onClick={() => navigate('/predict/history')}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black text-lg rounded-full shadow-[0_0_25px_rgba(147,51,234,0.7)] hover:shadow-[0_0_35px_rgba(147,51,234,0.9)] transition-all duration-300 transform hover:scale-105 border-2 border-purple-400/50"
        >
          BETTING HISTORY
        </button>
      </div>

      {/* Carousel Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md relative z-10 px-4 mt-4">

        {/* Cards Stack */}
        <div className="relative w-full aspect-[3/4] max-h-[600px]" style={{ perspective: '1000px' }}>
             
             {/* Loading State */}
             {markets.length === 0 && isLoading && (
                 <SkeletonCard position="center" />
             )}

             {/* Cards */}
             {markets.length > 0 && indicesToRender.map((idx) => {
                 let position = 'center';
                 if (idx === activeIndex) position = 'center';
                 else if (idx === activeIndex - 1) position = 'left';
                 else if (idx === activeIndex + 1) position = 'right';
                 else if (idx < activeIndex) position = 'hiddenLeft';
                 else if (idx > activeIndex) position = 'hiddenRight';
                 
                 return (
                     <PredictionCard 
                         key={markets[idx].id}
                         market={markets[idx]}
                         position={position}
                         currentOdds={markets[idx].id === currentMarket?.id ? currentOdds : {yes:1, no:1}}
                         onClick={() => {
                             if (position === 'left') handlePrev();
                             if (position === 'right') handleNext();
                         }}
                     />
                 );
             })}
             
             {/* Loading Indicator for Infinite Scroll */}
             {isLoading && markets.length > 0 && (
                 <div className="absolute bottom-4 text-xs text-gray-500 animate-pulse">
                     LOADING INTEL...
                 </div>
             )}

             {/* Error / Retry */}
             {loadError && (
                 <div className="absolute bottom-4 flex flex-col items-center">
                     <span className="text-xs text-red-500 mb-1">CONNECTION LOST</span>
                     <button onClick={loadMore} className="px-3 py-1 bg-red-900/50 border border-red-500 text-red-300 text-xs rounded hover:bg-red-800">
                         RETRY
                     </button>
                 </div>
             )}
        </div>
      </div>

      {/* Betting Buttons */}
      <div className="w-full max-w-md px-6 pb-6 z-20">
        {currentMarket && new Date() > new Date(currentMarket.endTime) ? (
            <div className="bg-gray-800/80 backdrop-blur border border-gray-600 rounded-xl py-4 text-center">
                <h3 className="text-xl font-bold text-gray-400">BETTING CLOSED</h3>
                <p className="text-xs text-gray-500 mt-1">
                    Event has ended. Awaiting results.
                </p>
            </div>
        ) : (
            <div className="flex gap-4">
                <button 
                    onClick={() => initiateBet('NO')}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xl py-4 rounded-xl border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    <X size={24} strokeWidth={4} />
                    NO
                </button>
                <button 
                    onClick={() => initiateBet('YES')}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black text-xl py-4 rounded-xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    <Check size={24} strokeWidth={4} />
                    YES
                </button>
            </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmBet && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
                <div className="flex justify-center mb-4 text-yellow-500">
                    <AlertTriangle size={48} />
                </div>
                <h3 className="text-xl font-bold text-center text-white mb-2">CONFIRM TRANSACTION</h3>
                <p className="text-center text-gray-400 text-sm mb-6">
                    You are about to place a bet on:
                    <br/>
                    <span className="text-white font-bold block mt-2 p-2 bg-gray-800 rounded">{confirmBet.marketQuestion}</span>
                </p>
                
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-xs">BETTING ON</span>
                        <span className={`font-black text-lg ${confirmBet.direction === 'YES' ? 'text-green-500' : 'text-red-500'}`}>
                            {confirmBet.direction}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs">COST</span>
                        <span className="font-mono font-bold text-yellow-500">{confirmBet.amount} TWSCoin</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setConfirmBet(null)}
                        className="flex-1 py-3 bg-gray-800 text-gray-400 font-bold rounded-lg hover:bg-gray-700"
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={executeBet}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                    >
                        CONFIRM
                    </button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin God Mode Button */}
      {isAdmin && (
        <div className="absolute top-0 right-0 w-10 h-10 z-50 cursor-default" onClick={() => setAdminMode(!adminMode)} title="God Mode"></div>
      )}

      {/* Footer Status */}
      <div className="w-full max-w-md p-3 flex justify-between border-t border-gray-800 bg-black text-xs font-mono text-gray-600 z-10">
        <span>STATUS: ONLINE</span>
        <span>BURNED: 1,204,500 TWS</span>
      </div>
      
      {/* Admin Panel (Simplified/Preserved) */}
      {adminMode && isAdmin && (
        <div className="absolute inset-0 bg-black/95 z-50 p-6 flex flex-col overflow-y-auto">
             {/* ... Admin content preserved logic ... */}
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-yellow-500">GOD MODE</h2>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-sm">+ ADD MARKET</button>
                    <button onClick={() => setAdminMode(false)} className="text-gray-500 hover:text-white">CLOSE</button>
                </div>
            </div>
            {markets.map(m => (
                <div key={m.id} className="border border-gray-800 p-4 mb-4 rounded bg-gray-900">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-500">ID: {m.id}</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleEditMarket(m)} className="text-blue-500 text-xs hover:underline">EDIT</button>
                            <button onClick={() => handleDistributePrizes(m.id)} className="text-green-500 text-xs hover:underline">DISTRIBUTE</button>
                            <button onClick={() => handleDeleteMarket(m.id)} className="text-red-500 text-xs hover:underline">DELETE</button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-2 truncate">{m.question}</p>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-600 font-mono">
                        <span>End: {m.endTime}</span>
                        <span>Draw: {m.drawTime}</span>
                    </div>
                </div>
            ))}
            
            {/* Add/Edit Market Modal */}
            {showAddModal && (
                <div className="absolute inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold text-white mb-4">{editingMarket ? 'EDIT MARKET' : 'NEW MARKET'}</h3>
                        <form onSubmit={handleSaveMarket} className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500">Question</label>
                                <input required className="w-full bg-black border border-gray-700 text-white p-2 rounded" value={newMarketForm.question} onChange={e => setNewMarketForm({...newMarketForm, question: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Image URL</label>
                                <input className="w-full bg-black border border-gray-700 text-white p-2 rounded" value={newMarketForm.image} onChange={e => setNewMarketForm({...newMarketForm, image: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Online Time</label>
                                    <input type="datetime-local" required className="w-full bg-black border border-gray-700 text-white p-2 rounded" value={newMarketForm.onlineTime} onChange={e => setNewMarketForm({...newMarketForm, onlineTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Start Time</label>
                                    <input type="datetime-local" required className="w-full bg-black border border-gray-700 text-white p-2 rounded" value={newMarketForm.startTime} onChange={e => setNewMarketForm({...newMarketForm, startTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">End Time</label>
                                    <input type="datetime-local" required className="w-full bg-black border border-gray-700 text-white p-2 rounded" value={newMarketForm.endTime} onChange={e => setNewMarketForm({...newMarketForm, endTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Draw Time</label>
                                    <input type="datetime-local" required className="w-full bg-black border border-gray-700 text-white p-2 rounded" value={newMarketForm.drawTime} onChange={e => setNewMarketForm({...newMarketForm, drawTime: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Pool YES</label>
                                    <input type="number" className="w-full bg-black border border-gray-700 text-white p-2 rounded" value={newMarketForm.poolYes} onChange={e => setNewMarketForm({...newMarketForm, poolYes: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Pool NO</label>
                                    <input type="number" className="w-full bg-black border border-gray-700 text-white p-2 rounded" value={newMarketForm.poolNo} onChange={e => setNewMarketForm({...newMarketForm, poolNo: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button type="button" onClick={() => { setShowAddModal(false); setEditingMarket(null); }} className="flex-1 py-2 bg-gray-700 text-white rounded font-bold">CANCEL</button>
                                <button type="submit" className="flex-1 py-2 bg-yellow-500 text-black rounded font-bold">SAVE</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
      )}
      {/* Wallet Connect Type Modal */}
      <ConnectWalletModal 
        isOpen={showConnectTypeModal} 
        onClose={() => setShowConnectTypeModal(false)} 
        onSelectType={handleSelectWalletType} 
      />
    </div>
  );
};

export default PredictionHome;
