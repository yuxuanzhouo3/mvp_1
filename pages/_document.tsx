import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  const defaultLang = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? 'zh-CN' : 'en';

  return (
    <Html lang={defaultLang}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
