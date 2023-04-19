import { KameleoonClient } from '@kameleoon/nodejs-sdk'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import clientConfiguration from './lib/kameleoon/client-configuration.json'

// KameleoonClient accepts siteCode parameter whose type is only string
// Since the process.env.KAMELEOON_SITE_CODE returns by default string | undefined types
// This declaration sets only string type to process.env.KAMELEOON_SITE_CODE
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      KAMELEOON_SITE_CODE: string
    }
  }
}

const KAMELEOON_USER_ID = 'kameleoon_user_id'

// Replace it with your featureKey from Kameleoon Platform
const FEATURE_KEY = 'YOUR_FEATURE_KEY'

// On these paths the current middleware will be invoked
export const config = {
  matcher: ['/', '/feature'],
}

export default async function middleware(req: NextRequest) {
  // Fetch user id from the cookie if available to make sure that results are sticky
  // If you have your own unique user identifier, please replace crypto.randomUUID() with it
  const visitorCode =
    req.cookies.get(KAMELEOON_USER_ID)?.value || crypto.randomUUID()

  // Create KameleoonClient instance using clientConfiguration downloaded at build time
  const kameleoonClient = new KameleoonClient({
    siteCode: process.env.KAMELEOON_SITE_CODE,
    integrations: {
      externalClientConfiguration: JSON.parse(
        JSON.stringify(clientConfiguration)
      ),
    },
  })

  // Initialize Kameleoon client before using it's methods
  await kameleoonClient.initialize()

  // Returns a boolean indicating whether the visitor with visitorCode has featureKey active for him
  const isFeatureActive = kameleoonClient.isFeatureFlagActive(
    visitorCode,
    FEATURE_KEY
  )

  console.log(
    `[KAMELEOON] Feature flag with '${FEATURE_KEY}' feature key is '${
      isFeatureActive ? 'active' : 'inactive'
    }'`
  )

  // Rewriting the path based on `isFeatureActive` boolean
  // If the value is true, it returns `feature` path
  req.nextUrl.pathname = isFeatureActive ? '/feature' : '/'
  const response = NextResponse.rewrite(req.nextUrl)

  if (!req.cookies.has(KAMELEOON_USER_ID)) {
    // Saving visitorCode in the cookie so that the decision sticks for subsequent visits
    response.cookies.set(KAMELEOON_USER_ID, visitorCode)
  }

  // Return the response
  return response
}
