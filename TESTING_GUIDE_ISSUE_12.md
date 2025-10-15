# 🧪 Testing Guide - GitHub Issue #12
## OPD Management 2: Two New Features

---

## ✅ **What Was Implemented**

### Feature 1: OPD Chain History Modal (Hover)
- Shows complete patient journey through different OPDs
- Displays on hover over referred patients
- Shows timestamps, status, and remarks/notes

### Feature 2: Call Patient "Out of Queue"
- Allows calling any specific patient directly
- Bypasses normal sequential queue order
- Available for all "Pending" patients

---

## 🚀 **Step-by-Step Testing Instructions**

### 📋 **Prerequisites**

1. **Backend must be running:**
   ```bash
   cd backend
   python -m uvicorn main:app --reload --port 8000
   ```

2. **Frontend must be running:**
   ```bash
   cd frontend
   npm start
   ```

3. **Browser:** Open http://localhost:3000

---

## 🧪 **TEST 1: Call Patient "Out of Queue"**

### Step 1: Prep Test Data
1. Login with username: `admin` / password: `admin123`
2. Go to **Dashboard** → **OPD Management**
3. Make sure you have at least 2-3 patients in the queue with "Waiting/Pending" status
   - If not, register patients via **Patient Registration**

### Step 2: Test the Feature
1. In the **Patient Queue** list, look at patients with **yellow/orange "Waiting" chip**
2. Next to each waiting patient, you'll see a new **📞 phone icon button** (blue color)
3. **Hover** over it - tooltip says: "Call Out of Queue - Call this specific patient directly"
4. Click the 📞 button on the **3rd patient** in line (not the first one)

### ✅ **Expected Results:**
- ✓ Success message appears: "Patient [TOKEN] called out of queue"
- ✓ The 3rd patient immediately moves to "In OPD" status (blue chip)
- ✓ They are now being seen, even though they weren't next in line
- ✓ Queue updates in real-time
- ✓ Other patients remain in their positions

### ❌ **If it doesn't work:**
- Button is missing → Check if patient status is "pending" (not "in" or "dilated")
- Error message → Check backend console for errors
- Button disabled → Wait for previous action to complete

---

## 🧪 **TEST 2: OPD Chain History Modal (Hover Feature)**

### Step 1: Create Referred Patient (Test Data)
First, you need to create a patient who has been referred between OPDs:

1. **Register a new patient:**
   - Go to **Patient Registration**
   - Fill in name (e.g., "Test Patient"), age, phone
   - Click **Register**

2. **Allocate to OPD 1:**
   - In the same screen, click **"Allocate to OPD"**
   - Select **OPD 1**
   - Click **Allocate**

3. **Call the patient in OPD 1:**
   - Go to **OPD Management**
   - Select **OPD 1** from dropdown
   - Click **"Call Next Patient"** button
   - Patient should now show "In OPD" status (blue chip)

4. **Refer patient to OPD 2:**
   - Find the patient in the queue (now showing "In OPD")
   - Click the **"Refer"** button
   - In the dialog, select **OPD 2**
   - Add remarks (e.g., "Needs specialist opinion")
   - Click **Refer**

### Step 2: Test the Hover Feature
1. **Switch to OPD 2:**
   - In OPD Management dropdown, select **OPD 2**

2. **Find the Referred Patients section:**
   - Scroll down below the main queue
   - You'll see: **"Referred Patients (OPD: OPD2)"**
   - Right column says: **"Referred TO this OPD"**
   - You should see your test patient listed there
   - There's instruction text: "Hover over a patient to see their OPD chain history"

3. **Hover over the patient row:**
   - Move your mouse over the patient's row (don't click!)
   - The row should highlight (gray background)

### ✅ **Expected Results:**
- ✓ **A popover appears on the right side** showing "Patient OPD Chain History"
- ✓ You see a timeline of movements, something like:
  ```
  Patient OPD Chain History
  
  1. registration → opd_opd1
     Status: pending
     Time: 10:30:15 AM
  
  2. waiting_area → opd_opd1
     Status: in
     Time: 10:35:22 AM
  
  3. opd_opd1 → opd_opd2
     Status: referred
     Time: 10:40:18 AM
     Notes: Needs specialist opinion
  ```
- ✓ Each step shows: from → to, status, timestamp, and notes (if any)
- ✓ When you move mouse away, popover disappears

### Alternative: Click the Timeline Icon
- Instead of hovering, you can click the **📊 Timeline icon** (blue) next to the patient
- Same popover appears

### ❌ **If it doesn't work:**
- No "Referred TO this OPD" section → No patients have been referred to this OPD yet
- Popover doesn't appear → Check browser console for errors
- Empty history → Patient is new, check if they have any movements
- Hover not working → Try clicking the Timeline icon instead

---

## 📸 **Visual Guide - What To Look For**

### Feature 1: Call Out of Queue Button
```
Patient Queue
┌─────────────────────────────────────────────────────┐
│ 1. 0001 - John Doe                                  │
│    Age: 45 | Waiting: 15 min                        │
│    [Waiting] 📞 [Dilate] [Refer] [End Visit]       │ ← NEW BUTTON
├─────────────────────────────────────────────────────┤
│ 2. 0002 - Jane Smith                                │
│    Age: 32 | Waiting: 10 min                        │
│    [Waiting] 📞 [Dilate] [Refer] [End Visit]       │ ← NEW BUTTON
└─────────────────────────────────────────────────────┘
```

### Feature 2: OPD Chain History Popover
```
Referred Patients (OPD: OPD2)
┌───────────────────────────────────────────┐
│ Referred TO this OPD                      │
│ (Hover to see OPD chain history)          │
│                                           │
│ ┌─────────────────────────────────────┐  │
│ │ 0001 - Test Patient                 │  │ ← Hover here
│ │ From: OPD1 | Time: 10:40 AM         │  │
│ │ [Referred] 📊                       │  │
│ └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘

                                    ┌─────────────────────────┐
                                    │ Patient OPD Chain       │ ← Popover appears
                                    │ History                 │
                                    │                         │
                                    │ registration → opd_opd1 │
                                    │ Status: pending         │
                                    │ Time: 10:30 AM          │
                                    │                         │
                                    │ opd_opd1 → opd_opd2     │
                                    │ Status: referred        │
                                    │ Time: 10:40 AM          │
                                    │ Notes: Needs specialist │
                                    └─────────────────────────┘
```

---

## ✅ **Verification Checklist**

After testing, verify these items:

### Backend API Endpoints
- [ ] GET `/api/patients/{patient_id}/flow-history` - Returns patient journey
- [ ] POST `/api/opd/{opd_type}/call-out-of-queue/{patient_id}` - Calls specific patient

### Frontend Features
- [ ] 📞 "Call Out of Queue" button visible on pending patients
- [ ] Clicking button calls that specific patient (bypasses queue order)
- [ ] Success message appears after calling
- [ ] "Referred TO this OPD" section exists
- [ ] Hover over referred patient shows popover
- [ ] Popover displays complete OPD chain history
- [ ] Timeline icon 📊 also triggers the popover
- [ ] Popover closes when mouse leaves
- [ ] History shows: from → to, status, time, notes

---

## 🐛 **Troubleshooting**

### Issue: Backend not responding
**Solution:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not, restart:
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Issue: "Call Out of Queue" button missing
**Cause:** Patient is not in "pending" status
**Solution:** Only patients with "Waiting/Pending" status can be called out of queue

### Issue: Popover not showing
**Cause 1:** No referred patients in this OPD
**Solution:** Create test data (refer a patient to this OPD)

**Cause 2:** JavaScript error
**Solution:** Open browser console (F12) and check for errors

### Issue: Empty flow history
**Cause:** New patient with no movements yet
**Solution:** Patient needs to have some activity (allocated, called, referred) to have history

---

## 📊 **Test Scenarios**

### Scenario 1: Emergency Patient Needs Immediate Attention
**Situation:** Patient #5 in queue is an emergency case

**Test:**
1. Click 📞 button on patient #5
2. Patient #5 immediately called (status → "In OPD")
3. Other patients (1-4) remain waiting in original order

**Result:** ✅ Emergency patients can be prioritized

### Scenario 2: Track Patient Journey Through Multiple OPDs
**Situation:** Patient visited OPD1 → OPD2 → OPD3

**Test:**
1. Register patient → Allocate to OPD1
2. Call patient in OPD1 → Refer to OPD2 with notes
3. In OPD2, refer to OPD3 with different notes
4. Go to OPD3, hover over patient in "Referred TO" section
5. See complete chain: registration → OPD1 → OPD2 → OPD3
6. Each transition shows timestamp and notes

**Result:** ✅ Complete patient journey is tracked and visible

---

## 🎯 **Success Criteria**

Both features are working correctly if:

✅ **Feature 1 (Call Out of Queue):**
- Button appears for all pending patients
- Clicking calls that specific patient immediately
- Queue order is bypassed as expected
- Real-time updates work

✅ **Feature 2 (OPD Chain History):**
- Referred patients section shows patients
- Hover triggers popover with history
- Timeline icon also works
- History shows complete journey with timestamps and notes
- Popover closes properly

---

## 📝 **Notes**

- Both features work independently
- No existing functionality is broken
- Real-time WebSocket updates still work
- All authentication/permissions still apply
- Database schema unchanged (uses existing PatientFlow table)

---

**🎉 If both tests pass, GitHub Issue #12 is RESOLVED!**

Report any issues you find during testing.

