namespace UserManagment.API.Services;

public class PlatformEmailOptions
{
    public const string SectionName = "PlatformEmail";

    public bool Enabled { get; set; } = true;
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string From { get; set; } = "contact.mentorhub@gmail.com";
    public string FromDisplayName { get; set; } = "MentorHub";
    public bool UseStartTls { get; set; } = true;
}
