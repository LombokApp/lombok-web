import type { NextPage } from 'next'
import React from 'react'
import { UserTasksScreen } from '../../views/user-tasks-screen/user-tasks-screen'

const Tasks: NextPage = () => {
  return (
    <div className="h-full w-full">
      <UserTasksScreen />
    </div>
  )
}

export default Tasks
