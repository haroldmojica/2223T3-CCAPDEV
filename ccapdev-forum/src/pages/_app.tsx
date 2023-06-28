import { type AppType } from "next/app";
import { dark } from '@clerk/themes';
import { api } from "~/utils/api";

import "~/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import Head from "next/head";

const MyApp: AppType = ({ Component, pageProps }) => {
  return <ClerkProvider
        appearance={{
          baseTheme: dark
        }}
        {...pageProps}
        
      >
        <Head>
          <title>Forum</title>
          <meta name="description"/>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Toaster  position="bottom-center"/>
      <Component {...pageProps} />
    </ClerkProvider>;
};

export default api.withTRPC(MyApp);
