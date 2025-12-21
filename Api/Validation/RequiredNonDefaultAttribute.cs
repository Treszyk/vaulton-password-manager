using System.ComponentModel.DataAnnotations;

namespace Api.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class RequiredNonDefaultAttribute : ValidationAttribute
{
	private const string DefaultErrorMessage = "The {0} field must be non-default.";

	public RequiredNonDefaultAttribute()
	{
		ErrorMessage = DefaultErrorMessage;
	}

	public override bool IsValid(object? value)
	{
		if (value is null)
		{
			return false;
		}

		var valueType = value.GetType();
		if (!valueType.IsValueType)
		{
			return true;
		}

		var defaultValue = Activator.CreateInstance(valueType);
		return !Equals(value, defaultValue);
	}
}