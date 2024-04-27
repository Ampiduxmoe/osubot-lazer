# Personal notes on osu! api internal types
Purpose of all files in this folder is to cover all types that are commonly used by [osu api v2](https://osu.ppy.sh/docs/index.html)
## Type mapping rules
- All types should be relatively small and widely used by 'bigger' types that are returned by endpoints
  - 'Bigger' types should be placed in folders with endpoint wrappers that return them
- Main source of trust for types should be the [osu-web repository](https://github.com/ppy/osu-web)
- All files should contain references to [osu-web repository](https://github.com/ppy/osu-web) that prove mapping correctness
  - Best reference is a reference to corresponding [Tranformer](https://github.com/ppy/osu-web/blob/master/app/Transformers)
- If it is hard to determine specific attribute type, use [wiki object structures](https://osu.ppy.sh/docs/index.html#object-structures)
- If wiki doesn't contain enough information:
  - If attribute is important and should be directly or indirectly used by some endpoint wrapper class, type should be determined empirically and defined by this wrapper directly on return value
  - If attrubute is not important to the app, it can be omitted (not recommended)
