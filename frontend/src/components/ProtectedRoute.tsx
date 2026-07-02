import { Navigate, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { hasPermission, hasRole } from '../lib/roles'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
  children?: ReactNode
  allowedRoles?: UserRole[]
  allowedPermissions?: string[]
  blockedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles, allowedPermissions, blockedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (blockedRoles && hasRole(user.role, blockedRoles)) {
    return <Navigate to="/dashboard" replace />
  }

  const checksRole = allowedRoles && allowedRoles.length > 0
  const checksPermission = allowedPermissions && allowedPermissions.length > 0
  const roleAllowed = checksRole ? hasRole(user.role, allowedRoles!) : false
  const permissionAllowed = checksPermission ? hasPermission(user.permissions, allowedPermissions!) : false

  if ((checksRole || checksPermission) && !roleAllowed && !permissionAllowed) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children ?? <Outlet />}</>
}
