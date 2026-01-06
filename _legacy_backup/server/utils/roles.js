/**
 * 用户角色定义
 * TWS 系统角色权限体系
 */

export const ROLES = {
  USER: 'USER',           // 普通用户（台湾用户）
  SUBMITTER: 'SUBMITTER', // 资产提交者（大陆老板）
  DEVELOPER: 'DEVELOPER', // 房地产开发商（可以提交和审核资产，但不能管理账户）
  REVIEWER: 'REVIEWER',   // 审核员
  ADMIN: 'ADMIN'          // 管理员（所有权限）
};

/**
 * 角色权限映射
 * 定义每个角色可以访问的功能
 */
export const ROLE_PERMISSIONS = {
  [ROLES.USER]: [
    'view_assets',
    'purchase_assets',
    'view_own_assets'
  ],
  [ROLES.SUBMITTER]: [
    'view_assets',
    'submit_assets',
    'view_own_submissions',
    'generate_contract'
  ],
  [ROLES.DEVELOPER]: [
    'view_assets',
    'submit_assets',
    'view_own_submissions',
    'review_assets',
    'approve_assets',
    'reject_assets',
    'view_pending_assets',
    'generate_contract',
    'edit_own_assets'
    // 注意：不包含用户账户管理权限
  ],
  [ROLES.REVIEWER]: [
    'view_assets',
    'review_assets',
    'approve_assets',
    'reject_assets',
    'view_pending_assets',
    'generate_contract'
  ],
  [ROLES.ADMIN]: [
    'all' // 管理员拥有所有权限（包括用户账户管理）
  ]
};

/**
 * 检查角色是否有特定权限
 * @param {string} role - 用户角色
 * @param {string} permission - 权限名称
 * @returns {boolean}
 */
export const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  
  // 管理员拥有所有权限
  if (role === ROLES.ADMIN) return true;
  
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission) || permissions.includes('all');
};

/**
 * 检查角色是否在允许的角色列表中
 * @param {string} userRole - 用户角色
 * @param {Array<string>} allowedRoles - 允许的角色数组
 * @returns {boolean}
 */
export const isRoleAllowed = (userRole, allowedRoles) => {
  if (!userRole || !allowedRoles || allowedRoles.length === 0) return false;
  return allowedRoles.includes(userRole);
};

/**
 * 获取角色的显示名称
 * @param {string} role - 角色代码
 * @returns {string}
 */
export const getRoleDisplayName = (role) => {
  const displayNames = {
    [ROLES.USER]: '普通用户',
    [ROLES.SUBMITTER]: '资产提交者',
    [ROLES.DEVELOPER]: '房地产开发商',
    [ROLES.REVIEWER]: '审核员',
    [ROLES.ADMIN]: '管理员'
  };
  return displayNames[role] || role;
};


