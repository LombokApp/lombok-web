import Head from 'next/head'
import React from 'react'

export const LandingPageHead = ({
  title,
  description,
}: {
  title: string
  description: string
}) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Stellaris cloud" />
    </Head>
  )
}
