{ rosetta ? false }:
  let
    overrides = if rosetta then { system = "x86_64-darwin"; } else {};

    sources  = import ./nix/sources.nix;
    pkgs     = import sources.nixpkgs  overrides;
    unstable = import sources.unstable overrides;
    # https://github.com/NixOS/nixpkgs/issues/53820
    yarn = unstable.yarn.override { nodejs = unstable.nodejs-16_x; };
  in

  pkgs.mkShell {
    buildInputs = [
      yarn
      unstable.nodejs-16_x
      unstable.niv
    ];
  }