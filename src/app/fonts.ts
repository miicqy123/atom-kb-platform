import localFont from 'next/font/local';

// 配置中文字体
export const notoSansSC = localFont({
  src: [
    {
      path: '../fonts/NotoSansSC-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/NotoSansSC-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/NotoSansSC-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-noto-sans-sc',
});

export const inter = {
  variable: '--font-inter',
};