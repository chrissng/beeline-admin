<template>
  <table>
    <thead>
      <tr>
        <th @click="currentlyViewedMonth = prevMonth">‹</th>
        <th @click="$emit('month-click', monthCanonical)" colspan="5">
          {{ (this.monthFormat || (x => this.f.date(x, 'mmmm yyyy')))(monthCanonical) }}
        </th>
        <th @click="currentlyViewedMonth = nextMonth">›</th>
      </tr>
      <tr>
        <th>S</th>
        <th>M</th>
        <th>T</th>
        <th>W</th>
        <th>T</th>
        <th>F</th>
        <th>S</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="week in weeks">
        <td v-for="i in Array(7).fill().map((_, i) => i)"
            @click="clicked(week[i])"
            :class="dayClasses(week[i])">
          {{week[i].day}}
          <div v-if="week[i].annotation" class="annotation">{{week[i].annotation}}</div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import dateformat from 'dateformat'

export default {
  props: {
    'value': {},
    'multiple': {},
    'offset': {},
    'month': {},
    'specialDates': {},
    'defaultDisable': {},
    'monthFormat': {},
    'otherMonthSelectable': {default: true},
  },
  data () {
    return {
      currentlyViewedMonth: this.month || new Date()
    }
  },
  watch: {
    currentlyViewedMonth() {
      this.$emit('month-changed', this.monthCanonical)
    }
  },
  computed: {
    f() {
      return {date: dateformat}
    },
    prevMonth () {
      return new Date(Date.UTC(
        this.monthCanonical.getUTCFullYear(),
        this.monthCanonical.getUTCMonth() - 1,
        1,
      ) + this.effectiveOffset)
    },
    nextMonth () {
      return new Date(Date.UTC(
        this.monthCanonical.getUTCFullYear(),
        this.monthCanonical.getUTCMonth() + 1,
        1,
      ) + this.effectiveOffset)
    },
    monthCanonical () {
      const month = this.currentlyViewedMonth || new Date()

      return new Date(month.getTime() - this.effectiveOffset)
    },
    firstDayOfCalendar () {
      const firstDayOfMonth = new Date(Date.UTC(
        this.monthCanonical.getUTCFullYear(),
        this.monthCanonical.getUTCMonth(),
        1
      ))

      return new Date(Date.UTC(
        firstDayOfMonth.getUTCFullYear(),
        firstDayOfMonth.getUTCMonth(),
        firstDayOfMonth.getUTCDate() - firstDayOfMonth.getUTCDay()
      ))
    },
    effectiveOffset () {
      return (typeof this.offset === 'number')
        ? this.offset
        : new Date().getTimezoneOffset() * 60000
    },
    specialDatesByTime () {
      if (!this.specialDates) return () => null

      // Build the date index for raw date values
      const dateIndex = _(this.specialDates)
        .filter(s => s.date instanceof Date)
        .groupBy(specialDate => this.canonicalTime(specialDate.date))
        .value()

      const dateFns = this.specialDates
        .filter(s => typeof s.date === 'function')

      return (canonicalTime) => {
        let merged = {}

        if (dateIndex[canonicalTime]) {
          merged = dateIndex[canonicalTime].reduce(mergeDateInfo, merged)
        }

        merged = dateFns
          .filter(dateFn => dateFn.date(new Date(canonicalTime + this.effectiveOffset)))
          .reduce(mergeDateInfo, merged)

        return merged
      }
    },
    weeks () {
      return [0, 1, 2, 3, 4, 5].map(
        weekNumber => [0,1,2,3,4,5,6].map(weekDay => {
          const canonical = ((weekNumber * 7) + weekDay) * 24*3600*1000 + this.firstDayOfCalendar.getTime()
          const canonicalDate = new Date(canonical)
          const isDifferentMonth = (canonicalDate.getMonth() !== this.monthCanonical.getMonth())
          const canonicalDateMetadata = this.specialDatesByTime(canonical)
          return {
            canonical,
            date: canonicalDate,
            day: canonicalDate.getDate(),
            disabled:
              (this.defaultDisable)
                ? !canonicalDateMetadata || !canonicalDateMetadata.enabled
                : canonicalDateMetadata && canonicalDateMetadata.disabled,
            differentMonth: isDifferentMonth,
            classes: ((canonicalDateMetadata && canonicalDateMetadata.classes) || []).filter(Boolean),
            annotation: canonicalDateMetadata && canonicalDateMetadata.annotation,
            selected: this.value && (this.multiple
              ? this.value.find(d => this.canonicalTime(d) === canonical)
              : this.canonicalTime(this.value) === canonical)
          }
        })
      )
    }
  },
  methods: {
    canonicalTime (date) {
      const tzDate = new Date(date.getTime() - this.effectiveOffset)
      const time = Date.UTC(tzDate.getUTCFullYear(), tzDate.getUTCMonth(), tzDate.getUTCDate())
      return time
    },
    clicked (day) {
      if (day.disabled) return
      if (!this.otherMonthSelectable && day.differentMonth) return

      if (this.multiple) {
        const index = this.value.findIndex(v => this.canonicalTime(v) === day.canonical)

        if (index === -1) {
          this.$emit('input', this.value.concat([this.toUserDate(day.date)]))
        } else {
          this.$emit('input', this.value
            .filter(v => this.canonicalTime(v) !== day.canonical))
        }
      } else {
        this.$emit('input', this.toUserDate(day.date))
      }
    },
    dayClasses (day) {
      const basic = {
        disabled: day.disabled,
        'different-month': day.differentMonth,
        selected: day.selected,
      }
      for (let d of day.classes) {
        basic[d] = true
      }
      return basic
    },
    toUserDate(date) {
      return new Date(date.getTime() + this.effectiveOffset)
    },
  }
}


function mergeDateInfo (a, b) {
  return {
    ...a, ...b,
    classes: _.flatten([a.classes, b.classes])
  }
}

</script>
