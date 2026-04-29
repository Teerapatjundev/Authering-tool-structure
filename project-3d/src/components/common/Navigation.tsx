import { NavLink } from 'react-router-dom'

import { paths } from '@/constants'

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  fontWeight: isActive ? 700 : 500,
  textDecoration: isActive ? 'underline' : 'none',
})

export function Navigation() {
  return (
    <nav
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        background: 'white',
      }}
    >
      <NavLink to={paths.home} style={linkStyle} end>
        Home
      </NavLink>
      <NavLink to={paths.editor} style={linkStyle}>
        Editor
      </NavLink>
      <NavLink to={paths.users} style={linkStyle}>
        Users
      </NavLink>
      <NavLink to={paths.cars} style={linkStyle}>
        Cars
      </NavLink>
      <NavLink to={paths.food} style={linkStyle}>
        Food
      </NavLink>
      <NavLink to={paths.login} style={linkStyle}>
        Login
      </NavLink>
    </nav>
  )
}

