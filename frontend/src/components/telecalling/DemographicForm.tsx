import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface DemographicFormData {
  dob: string;
  gender: string;
  location: string;
  education: string;
  occupation: string;
  incomeRange: string;
  preferredCourse: string;
  remarks: string;
}

interface DemographicFormProps {
  value: DemographicFormData;
  onChange: (next: DemographicFormData) => void;
  error?: string;
  onBack: () => void;
  onSubmit: () => void;
}

export function DemographicForm({ value, onChange, error, onBack, onSubmit }: DemographicFormProps) {
  return (
    <div className="space-y-4 rounded-xl bg-card p-5 shadow-card">
      <h3 className="text-sm font-semibold text-card-foreground">Demographic Details</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>DOB <span className="text-destructive">*</span></Label>
          <Input
            type="date"
            value={value.dob}
            onChange={(e) => onChange({ ...value, dob: e.target.value })}
            placeholder="Select date of birth"
          />
        </div>
        <div>
          <Label>Gender <span className="text-destructive">*</span></Label>
          <Select value={value.gender} onValueChange={(v) => onChange({ ...value, gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Location <span className="text-destructive">*</span></Label>
          <Input value={value.location} onChange={(e) => onChange({ ...value, location: e.target.value })} placeholder="City / Area" />
        </div>
        <div>
          <Label>Education <span className="text-destructive">*</span></Label>
          <Input value={value.education} onChange={(e) => onChange({ ...value, education: e.target.value })} placeholder="Highest education" />
        </div>
        <div>
          <Label>Occupation <span className="text-destructive">*</span></Label>
          <Input value={value.occupation} onChange={(e) => onChange({ ...value, occupation: e.target.value })} placeholder="Current occupation" />
        </div>
        <div>
          <Label>Income Range <span className="text-destructive">*</span></Label>
          <Input value={value.incomeRange} onChange={(e) => onChange({ ...value, incomeRange: e.target.value })} placeholder="e.g. 25k-40k" />
        </div>
        <div>
          <Label>Preferred Course <span className="text-destructive">*</span></Label>
          <Input value={value.preferredCourse} onChange={(e) => onChange({ ...value, preferredCourse: e.target.value })} placeholder="Preferred course" />
        </div>
        <div className="col-span-2">
          <Label>Remarks</Label>
          <Textarea
            rows={3}
            value={value.remarks}
            onChange={(e) => onChange({ ...value, remarks: e.target.value })}
            placeholder="Additional details"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button className="flex-1" onClick={onSubmit}>Submit & Continue</Button>
      </div>
    </div>
  );
}
