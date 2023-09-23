import type { NextPage } from 'next'
import React from 'react'

import { LoginSignupForm } from '../views/login-signup-form/login-signup-form'

const Login: NextPage = () => {
  return (
    <div className="h-full w-full text-center flex flex-col justify-around">
      <LoginSignupForm shouldShowSignup={true} />
    </div>
  )
}

export default Login
