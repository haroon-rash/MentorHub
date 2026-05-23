using System;

namespace UserManagment.API.Middleware;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequireApprovedTutorAttribute : Attribute
{
}
