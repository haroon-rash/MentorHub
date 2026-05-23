namespace UserManagment.Application.Helpers;

public static class GradeCalculator
{
    public static (decimal Percentage, string Letter) Compute(decimal obtained, decimal total)
    {
        if (total <= 0)
        {
            return (0, "N/A");
        }

        var pct = Math.Round(obtained / total * 100m, 2);
        var letter = pct switch
        {
            >= 90 => "A+",
            >= 80 => "A",
            >= 70 => "B",
            >= 60 => "C",
            >= 50 => "D",
            _ => "F"
        };
        return (pct, letter);
    }
}
