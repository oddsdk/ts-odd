let
  sources  = import ./nix/sources.nix;
  pkgs     = import sources.nixpkgs  {};
  unstable = import sources.unstable {};
in

pkgs.mkShell {
  buildInputs = [
    unstable.yarn
    unstable.nodejs-15_x
    unstable.niv
  ];

  shellHook = ''
    ${unstable.yarn}/bin/yarn install
  '';
}
