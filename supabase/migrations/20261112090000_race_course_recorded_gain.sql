update public.race_courses as course
set elevation_gain_m = round(activity.elevation_gain_meters)::integer
from public.provider_activities as activity
where course.source = 'activity'
  and activity.id::text = course.source_activity_id
  and activity.user_id = course.user_id
  and activity.elevation_gain_meters > 0
  and activity.elevation_gain_meters <= 60000;
