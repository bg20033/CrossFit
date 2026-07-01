namespace StandUpFitness.Services;

// Server-side port of the TDEE/BMR/macro formula (README → "TDEE Calculator").
// Uses MidpointRounding.AwayFromZero so results match the frontend's Math.round.
public static class TdeeCalculator
{
    public static readonly IReadOnlyDictionary<string, double> ActivityFactors = new Dictionary<string, double>
    {
        ["sedentary"] = 1.2,
        ["light"] = 1.375,
        ["moderate"] = 1.55,
        ["high"] = 1.725,
        ["veryHigh"] = 1.9,
    };

    public record Result(int Bmr, int Tdee, int Target, int Protein, int Fat, int Carbs);

    private static int R(double v) => (int)Math.Round(v, MidpointRounding.AwayFromZero);

    public static Result Calc(string gender, double weightKg, double heightCm, int age, string activity, string goal)
    {
        var bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender == "M" ? 5 : -161);
        var factor = ActivityFactors.TryGetValue(activity, out var f) ? f : 1.2;
        var tdee = R(bmr * factor);

        var target = goal switch
        {
            "lose" => tdee - 500,
            "gain" => tdee + 400,
            _ => tdee,
        };

        var protein = R(weightKg * 2);
        var fat = R(target * 0.25 / 9);
        var carbs = Math.Max(0, R((target - protein * 4.0 - fat * 9.0) / 4.0));

        return new Result(R(bmr), tdee, target, protein, fat, carbs);
    }
}
