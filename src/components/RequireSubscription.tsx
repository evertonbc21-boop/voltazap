import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { usePlan } from '../context/PlanContext'

/** Bloqueia o app quando o teste de 7 dias acabou e ainda não há assinatura. */
export function RequireSubscription() {
  const { hasAccess } = usePlan()
  const location = useLocation()

  if (!hasAccess) {
    return <Navigate to="/assinar" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
