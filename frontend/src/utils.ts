export const getAuthHeader = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*\s*)auth_token\s*\=\s*([^]*).*$)|^.*$/, "$1")}`
})
