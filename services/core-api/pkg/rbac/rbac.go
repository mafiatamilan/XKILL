package rbac

type Role string

const (
	RoleAdmin       Role = "admin"
	RoleTPO         Role = "tpo"
	RoleRecruiter   Role = "recruiter"
	RoleMentor      Role = "mentor"
	RoleStudent     Role = "student"
	RoleSysAdmin    Role = "sysadmin"
)

type Permission string

type Resource string

type Action string

var rolePermissions = map[Role][]Permission{}

func HasPermission(role Role, permission Permission) bool {
	perms, ok := rolePermissions[role]
	if !ok {
		return false
	}
	for _, p := range perms {
		if p == permission {
			return true
		}
	}
	return false
}
